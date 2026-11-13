// 纯战斗规则：只读取传入状态，返回新状态和事件，不访问页面、全局战局或浏览器存储。
(function (root, factory) {
    const rules = factory();
    if (typeof module === 'object' && module.exports) module.exports = rules;
    else root.BattleRules = rules;
})(typeof window === 'undefined' ? globalThis : window, function () {
    'use strict';

    const EXPERIENCE_THRESHOLDS = Object.freeze([20, 48, 96, 144, 216]);

    function requireUnit(state, id) {
        if (!Number.isInteger(id) || !state.units[id]) throw new RangeError('Unknown battle unit');
        return state.units[id];
    }

    function requireAmount(amount) {
        if (!Number.isFinite(amount) || amount < 0) throw new RangeError('Invalid battle amount');
    }

    function copyState(state) {
        return { ...state, units: state.units.slice(), achievements: { ...state.achievements } };
    }

    function unlock(state, key, events) {
        if (!state.achievements[key]) {
            state.achievements[key] = true;
            events.push({ type: 'achievement-unlocked', key });
        }
    }

    function addExperience(state, id, amount, events) {
        const unit = { ...state.units[id] };
        unit.exp += amount;
        // 保留原有数值规则：经验严格超过阈值时升一级，每次结算至多升一级。
        const threshold = EXPERIENCE_THRESHOLDS[unit.level - 1];
        if (threshold !== undefined && unit.exp > threshold) {
            unit.exp -= threshold;
            unit.level++;
        }
        state.units[id] = unit;
        const players = state.units.filter(candidate => candidate.commander_type === 'player');
        if (players.length > 0 && players.every(candidate => candidate.level >= 6)) {
            unlock(state, 'ach7', events);
        }
    }

    function gainExperience(state, unitId, amount) {
        requireUnit(state, unitId);
        requireAmount(amount);
        const next = copyState(state);
        const events = [];
        addExperience(next, unitId, amount, events);
        return { state: next, events };
    }

    function resolveDamage(state, { targetId, amount, sourceId = null, ignoreArmor = false }) {
        const target = requireUnit(state, targetId);
        requireAmount(amount);
        const source = sourceId == null ? null : requireUnit(state, sourceId);
        // 已死亡单位不再结算伤害，也不重复发放经验、计数或死亡事件。
        if (!target.is_alive) return { state, events: [], died: false };

        const next = copyState(state);
        const events = [];
        const absorbed = ignoreArmor ? 0 : Math.min(target.armor, amount);
        const unit = {
            ...target,
            armor: target.armor - absorbed,
            health: Math.max(0, target.health - (amount - absorbed)),
        };
        next.units[targetId] = unit;
        if (unit.health > 0) return { state: next, events, died: false };

        unit.is_alive = false;
        events.push({ type: 'unit-died', unitId: targetId });
        if (unit.name === 'spirit') next.spiritCount++;

        if (source && unit.side === 1 && unit.side !== source.side && source.commander_type === 'player') {
            addExperience(next, sourceId, unit.exp, events);
            next.units.forEach((ally, id) => {
                if (id !== sourceId && ally.commander_type === 'player' && ally.is_alive) {
                    addExperience(next, id, Math.floor(unit.exp / 4), events);
                }
            });
        }

        if (unit.side === 0 && unit.commander_type === 'player' && unit.name === 'yedai' &&
            source && source.commander_type === 'player' && ['user', 'yuanlan'].includes(source.name)) {
            unlock(next, 'ach3', events);
        }
        return { state: next, events, died: true };
    }

    return { EXPERIENCE_THRESHOLDS, resolveDamage, gainExperience };
});
