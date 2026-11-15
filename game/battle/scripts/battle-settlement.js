// 两种回合入口共用终局流程；一旦接管，等待提示确认，不再推进战斗。
let battle_settlement_started = false;

function read_battle_outcome_state() {
    return {
        level: level, round: round, units: units, spiritCount: spirit_count,
        achievements: achievements, perfectLevels: current_info.perfect_level_complete,
    };
}

function check_game() {
    const result = BattleOutcomeRules.evaluate(read_battle_outcome_state());
    return { ongoing: 0, win: 1, lose: 2 }[result.outcome];
}

function settle_battle() {
    if (battle_settlement_started) return true;
    const result = BattleOutcomeRules.evaluate(read_battle_outcome_state());
    if (result.outcome === 'ongoing') return false;
    battle_settlement_started = true;
    // 取消尚未执行的回合推进，同时关闭战场操作入口。
    stop_turn_flow();

    units_display_update();
    load_items();

    current_info.perfect_level_complete = result.perfectLevels;
    for (const key of result.achievementKeys) achievements[key] = true;
    if (result.achievementKeys.length > 0) {
        localStorage.setItem(username + 'achievement', JSON.stringify(achievements));
    }
    for (const key of result.achievementKeys) achievement_popup(ACHIEVEMENT_IDS[key]);

    // 最后一击产生的满级等提示也必须确认，不能被通关提示或跳转覆盖。
    after_achievement_popups(function () {
        if (result.outcome === 'win') win();
        else lose();
    });
    return true;
}
