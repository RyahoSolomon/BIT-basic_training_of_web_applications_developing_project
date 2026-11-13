// 胜负和通关成就只由当前战局决定，不访问页面或存储，也不修改输入。
(function (root, factory) {
    const rules = factory();
    if (typeof module === 'object' && module.exports) module.exports = rules;
    else root.BattleOutcomeRules = rules;
})(typeof window === 'undefined' ? globalThis : window, function () {
    'use strict';

    function protectedUnitIsDead(units, name) {
        const unit = units.find(unit => unit.side === 0 && unit.name === name);
        return !unit || !unit.is_alive;
    }

    function getOutcome(state, players, enemiesDefeated) {
        const { level, round, units, spiritCount } = state;
        // 保留先判败、后判胜的顺序；额外关只要求阵法死士存活。
        if (level === 5) {
            if (protectedUnitIsDead(units, 'desperate')) return 'lose';
            return round >= 20 ? 'win' : 'ongoing';
        }
        if (level < 0 || level > 4) return 'ongoing';
        if (!players.some(unit => unit.is_alive)) return 'lose';
        if (level === 3 && protectedUnitIsDead(units, 'zijue')) return 'lose';
        if (level === 4) return spiritCount >= 8 ? 'win' : 'ongoing';
        if (enemiesDefeated) return 'win';
        if (level === 0 && units.some(unit => unit.is_alive && unit.side === 0 &&
            unit.y === 19 && [3, 4, 5].includes(unit.x))) return 'win';
        return 'ongoing';
    }

    function evaluate(state) {
        const players = state.units.filter(unit => unit.commander_type === 'player');
        const enemiesDefeated = !state.units.some(unit => unit.side === 1 && unit.is_alive);
        const outcome = getOutcome(state, players, enemiesDefeated);
        const perfectLevels = state.perfectLevels.slice();
        const achievementKeys = [];
        if (outcome === 'win') {
            if (players.every(unit => unit.is_alive)) perfectLevels[state.level] = true;
            const candidates = [
                ['ach8', state.level === 0 && enemiesDefeated],
                ['ach1', perfectLevels.length >= 6 && perfectLevels.slice(0, 6).every(Boolean)],
                ['ach4', players.filter(unit => unit.is_alive).length === 1],
            ];
            for (const [key, earned] of candidates) {
                if (earned && !state.achievements[key]) achievementKeys.push(key);
            }
        }
        return { outcome, perfectLevels, achievementKeys };
    }

    return { evaluate };
});
