// 玩家与 AI 共用的移动规则；只读取棋盘和单位数据，不访问页面或全局战局。
(function (root, factory) {
    const rules = factory();
    if (typeof module === 'object' && module.exports) module.exports = rules;
    else root.MovementRules = rules;
})(typeof window === 'undefined' ? globalThis : window, function () {
    'use strict';

    const BLOCKED_TERRAIN = new Set([4, 11, 16, 17, 18]);
    // 保持旧搜索顺序，避免改变 AI 在同等候选中随机选择时的结果。
    const DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const cellKey = (x, y) => x + ',' + y;

    function isInsideMap(map, x, y) {
        return Number.isInteger(x) && Number.isInteger(y) &&
            x >= 0 && x < map.length && Array.isArray(map[x]) && y >= 0 && y < map[x].length;
    }

    function isWalkableTerrain(terrain) {
        return Number.isFinite(terrain) && !BLOCKED_TERRAIN.has(terrain);
    }

    function getWalkableNeighbors(map, cell) {
        return DIRECTIONS.map(([dx, dy]) => ({ x: cell.x + dx, y: cell.y + dy }))
            .filter(({ x, y }) => isInsideMap(map, x, y) && isWalkableTerrain(map[x][y]));
    }

    function findReachableCells(state, unitId) {
        const { map, units } = state;
        const actor = Number.isInteger(unitId) && units[unitId];
        if (!actor) throw new RangeError('Unknown moving unit');
        if (!isInsideMap(map, actor.x, actor.y)) throw new RangeError('Moving unit is outside the map');
        if (!Number.isInteger(actor.speed)) throw new RangeError('Invalid movement speed');
        if (!actor.is_alive || actor.speed <= 0) return [];

        // 每个格子只读取一次占位；死者不挡路，重叠单位沿用先出现者的占位规则。
        const occupants = new Map();
        for (const unit of units) {
            if (unit.is_alive) {
                const key = cellKey(unit.x, unit.y);
                if (!occupants.has(key)) occupants.set(key, unit);
            }
        }

        const origin = { x: actor.x, y: actor.y, distance: 0 };
        const queue = [origin];
        const visited = new Set([cellKey(origin.x, origin.y)]);
        const destinations = [];

        // 每步代价均为 1；用队首索引遍历，首次到达的距离就是最短路长度。
        for (let head = 0; head < queue.length; head++) {
            const current = queue[head];
            if (current.distance >= actor.speed) continue;
            for (const neighbor of getWalkableNeighbors(map, current)) {
                const key = cellKey(neighbor.x, neighbor.y);
                if (visited.has(key)) continue;
                visited.add(key);
                const occupant = occupants.get(key);
                if (occupant && occupant.side !== actor.side) continue;

                const next = { ...neighbor, distance: current.distance + 1 };
                queue.push(next);
                // 友军可穿过但不能停留；起点也不作为移动目的地。
                if (!occupant) destinations.push(next);
            }
        }
        return destinations;
    }

    return { findReachableCells, getWalkableNeighbors, isWalkableTerrain };
});
