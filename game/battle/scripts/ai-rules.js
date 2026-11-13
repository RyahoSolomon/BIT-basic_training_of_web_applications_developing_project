// AI 只评估共享移动结果；候选选择不修改战局，也不访问页面或存储。
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('./movement-rules.js'));
    } else {
        root.AiRules = factory(root.MovementRules);
    }
})(typeof window === 'undefined' ? globalThis : window, function (movement) {
    'use strict';

    const UNREACHABLE_DISTANCE = 1000;
    const cellKey = cell => cell.x + ',' + cell.y;

    function enemyPositions(units, side) {
        const opposingSide = side === 0 ? 1 : 0;
        const enemies = new Map();
        units.forEach((unit, id) => {
            const key = cellKey(unit);
            if (unit.is_alive && unit.side === opposingSide && !enemies.has(key)) {
                enemies.set(key, id);
            }
        });
        return enemies;
    }

    function evaluateDestination(map, origin, attacker, enemies) {
        const queue = [{ x: origin.x, y: origin.y, distance: 0 }];
        const visited = new Set([cellKey(origin)]);
        let enemyDistance = UNREACHABLE_DISTANCE;
        let targetId = null;
        let targetRange = UNREACHABLE_DISTANCE;

        for (let head = 0; head < queue.length; head++) {
            const cell = queue[head];
            const enemyId = enemies.get(cellKey(cell));
            if (enemyId !== undefined) {
                enemyDistance = Math.min(enemyDistance, cell.distance);
                const range = Math.abs(cell.x - origin.x) + Math.abs(cell.y - origin.y);
                if (range >= attacker.min_range && range <= attacker.max_range && range < targetRange) {
                    targetId = enemyId;
                    targetRange = range;
                }
                // 保留原策略：搜索到敌人后不再穿过它继续扩展；射程仍按曼哈顿距离判断。
                continue;
            }
            for (const neighbor of movement.getWalkableNeighbors(map, cell)) {
                const key = cellKey(neighbor);
                if (visited.has(key)) continue;
                visited.add(key);
                queue.push({ ...neighbor, distance: cell.distance + 1 });
            }
        }
        return { x: origin.x, y: origin.y, targetId, enemyDistance };
    }

    function getCandidates(state, unitId) {
        const attacker = state.units[unitId];
        const reachableCells = movement.findReachableCells(state, unitId);
        const enemies = enemyPositions(state.units, attacker.side);
        const attackMoves = [];
        const moveMoves = [];
        for (const cell of reachableCells) {
            const candidate = evaluateDestination(state.map, cell, attacker, enemies);
            if (candidate.targetId !== null) attackMoves.push(candidate);
            else moveMoves.push(candidate);
        }
        // 原实现中所有可攻击位置等权；仅移动时优先靠近敌人，同分保持移动搜索顺序。
        moveMoves.sort((left, right) => left.enemyDistance - right.enemyDistance);
        return { reachableCells, attackMoves, moveMoves };
    }

    function chooseAction(state, unitId, random = Math.random) {
        const unit = state.units[unitId];
        const wait = { type: 'wait', x: unit.x, y: unit.y };
        if (unit.AI_type === 'wait') return wait;

        const { attackMoves, moveMoves } = getCandidates(state, unitId);
        let choices = attackMoves;
        let type = 'attack';
        if (choices.length === 0) {
            type = 'move';
            const nearestDistance = moveMoves[0]?.enemyDistance;
            choices = moveMoves.filter(candidate => candidate.enemyDistance === nearestDistance);
        }
        if (choices.length === 0) return wait;
        const choice = choices.length === 1 ? choices[0] : choices[Math.floor(random() * choices.length)];
        const action = { type, x: choice.x, y: choice.y };
        if (type === 'attack') action.targetId = choice.targetId;
        return action;
    }

    return { getCandidates, chooseAction };
});
