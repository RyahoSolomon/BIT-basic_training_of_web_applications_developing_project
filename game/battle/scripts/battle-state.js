// 页面适配：向规则传入当前战局，再统一应用结果、显示事件和保存成就。
function read_battle_state() {
    return { units: units, spiritCount: spirit_count, achievements: achievements };
}

function apply_battle_result(result) {
    result.state.units.forEach(function (next, id) {
        // 保留 Unit 实例及其方法，规则层只提供新的属性值。
        if (next !== units[id]) Object.assign(units[id], next);
    });
    spirit_count = result.state.spiritCount;
    Object.assign(achievements, result.state.achievements);

    result.events.forEach(function (event) {
        if (event.type === 'unit-died') {
            var unit = units[event.unitId];
            if (unit.side === 0) {
                announcement_list.push('[第' + round + '回合]' + unit.name_cn + '在战场上陨落了');
                load_annoucement();
            }
        } else if (event.type === 'achievement-unlocked') {
            var popupIds = { ach3: 2, ach7: 6 };
            achievement_popup(popupIds[event.key], '');
            localStorage.setItem(username + 'achievement', JSON.stringify(achievements));
            if (event.key === 'ach7') save_exp_info();
        }
    });
}

function apply_battle_damage(target, amount, sourceId, options = {}) {
    // 后续召唤单位未必带 uuid；以战局中的对象位置定位，覆盖初始与召唤单位。
    var result = BattleRules.resolveDamage(read_battle_state(), {
        targetId: units.indexOf(target), amount: amount, sourceId: sourceId,
        ignoreArmor: options.ignoreArmor === true,
    });
    apply_battle_result(result);
    return result.died;
}

function level_up(id, experience = 0) {
    apply_battle_result(BattleRules.gainExperience(read_battle_state(), id, experience));
}
