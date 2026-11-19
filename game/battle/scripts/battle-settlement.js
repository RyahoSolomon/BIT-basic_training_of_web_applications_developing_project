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
    finish_battle(result);
    return true;
}

function win() {
    if (battle_settlement_started) return;
    finish_battle({ outcome: 'win', perfectLevels: current_info.perfect_level_complete, achievementKeys: [] });
}

function show_battle_save_dialog(message, label, onConfirm) {
    const dialog = document.getElementById('battle-save-error');
    document.getElementById('battle-save-message').textContent = message;
    dialog.oncancel = event => event.preventDefault();
    const button = dialog.querySelector('button');
    button.textContent = label;
    button.onclick = () => {
        dialog.close();
        onConfirm();
    };
    dialog.showModal();
}

function battle_save_is_current() {
    if (GameProgress.isBattleCurrent()) return true;
    battle_settlement_started = true;
    stop_turn_flow();
    show_battle_save_dialog('当前存档已更换，本场战斗已结束。', '返回主菜单', () => {
        location.href = '../pages/menu.html';
    });
    return false;
}

function finish_battle(result) {
    battle_settlement_started = true;
    // 取消尚未执行的回合推进，同时关闭战场操作入口。
    stop_turn_flow();

    units_display_update();
    load_items();

    if (result.outcome === 'lose') {
        after_achievement_popups(() => { if (battle_save_is_current()) lose(); });
        return;
    }

    const current = battle_progress_snapshot();
    current.perfect_level_complete = result.perfectLevels;
    function saveVictory() {
        try {
            GameProgress.saveBattleVictory(current, result.achievementKeys);
        } catch (error) {
            if (error.code === 'BATTLE_REPLACED') battle_save_is_current();
            else show_battle_save_dialog('胜利进度保存失败。' + error.message, '重试保存', saveVictory);
            return;
        }
        current_info = current;
        for (const key of result.achievementKeys) {
            achievements[key] = true;
            achievement_popup(ACHIEVEMENT_IDS[key]);
        }
        after_achievement_popups(() => { if (battle_save_is_current()) show_victory_result(); });
    }
    saveVictory();
}
