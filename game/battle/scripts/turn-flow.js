// 行动按“玩家操作 / 电脑执行 → 确认 → 等待 → 下一单位”推进。
// 每次行动和等待任务都有标识，旧按钮与已取消的计时器不能推进新行动。
const battle_turn_flow = {
    id: 0, actor: null, phase: 'ready', timer: null, waitId: 0, suspended: false,
};
const TURN_DELAY_MS = 300;

function can_player_act() {
    return !battle_turn_flow.suspended && battle_turn_flow.phase === 'player' &&
        battle_turn_flow.actor === units[current_act_unit] && battle_turn_flow.actor.is_alive;
}

function clear_turn_controls() {
    selected_operation = '';
    reset_mask();
    reset_operations();
    document.getElementById('operation_hover_initial_mask').innerHTML = '';
    document.getElementById('selected_box').innerHTML = '';
    clear_operation_hover_mask();
}

function start_turn() {
    const flow = battle_turn_flow;
    if (flow.suspended || flow.phase === 'waiting' || flow.phase === 'ended') return;
    const actor = units[current_act_unit];
    if (!actor || !actor.is_alive) return;
    // 重复开始不能重置玩家移动次数，也不能让同一电脑单位再攻击一次。
    if (flow.phase !== 'ready' && flow.actor === actor) return;
    flow.id++;
    flow.actor = actor;
    flow.phase = actor.commander_type === 'player' ? 'player' : 'computer';
    clear_turn_controls();
    load_annoucement();
    units_display_update();
    load_items();
    if (flow.phase === 'player') {
        have_moved = false;
        selected_box_update();
        actor.commander.initial_UI(current_act_unit);
    } else {
        computer_operate();
    }
}

function begin_computer_action() {
    const flow = battle_turn_flow;
    if (flow.suspended || flow.phase !== 'computer' || flow.actor !== units[current_act_unit]) return false;
    flow.phase = 'acting';
    return true;
}

function initial_confirm() {
    const flow = battle_turn_flow;
    if (flow.phase !== 'acting') return;
    flow.phase = 'confirmation';
    const turnId = flow.id;
    operation_count = 1;
    document.getElementById('operations').innerHTML =
        '<img src="assets/images/ui/enemy-action-confirm.png" id="operation_0">';
    document.getElementById('operation_buttons').innerHTML =
        '<img src="assets/images/ui/button.png" id="operation_button_0">';
    document.getElementById('operation_hover_initial_mask').innerHTML =
        '<img src="assets/images/mask/transparent-operation-mask.png" id="operation_hover_initial_mask_0"' +
        ' title="确认:\n此按钮用于电脑角色行动后,请确认电脑角色行动后再点击本按钮以继续.">';
    const button = document.getElementById('operation_hover_initial_mask_0');
    button.onmouseenter = function () { load_operation_hover_mask(0); };
    button.onmouseleave = clear_operation_hover_mask;
    button.onclick = function () { confirm(turnId); };
    show_operations();
}

function confirm(turnId) {
    const flow = battle_turn_flow;
    if (flow.suspended || flow.phase !== 'confirmation' || flow.id !== turnId) return;
    finish_current_turn();
}

function end_turn() {
    // 电脑行动必须经本次确认按钮继续，玩家的重复请求在等待期间无效。
    if (battle_turn_flow.suspended || !['ready', 'player'].includes(battle_turn_flow.phase)) return;
    finish_current_turn();
}

function finish_current_turn() {
    if (settle_battle()) return;
    battle_turn_flow.phase = 'waiting';
    clear_turn_controls();
    units_display_update();
    load_items();
    load_annoucement();
    schedule_next_turn();
}

function cancel_turn_wait() {
    const flow = battle_turn_flow;
    flow.waitId++;
    if (flow.timer !== null) clearTimeout(flow.timer);
    flow.timer = null;
}

function schedule_next_turn() {
    const flow = battle_turn_flow;
    cancel_turn_wait();
    const waitId = flow.waitId;
    const turnId = flow.id;
    flow.timer = setTimeout(function () {
        if (flow.waitId !== waitId || flow.id !== turnId || flow.suspended || flow.phase !== 'waiting') return;
        flow.timer = null;
        if (settle_battle()) return;
        do {
            current_act_unit++;
            if (current_act_unit >= units_count) {
                if (end_round()) return;
                current_act_unit = 0;
            }
        } while (!units[current_act_unit].is_alive);
        flow.phase = 'ready';
        start_turn();
    }, TURN_DELAY_MS);
}

function stop_turn_flow() {
    cancel_turn_wait();
    battle_turn_flow.id++;
    battle_turn_flow.phase = 'ended';
    clear_turn_controls();
}

window.addEventListener('pagehide', function () {
    battle_turn_flow.suspended = true;
    cancel_turn_wait();
});
window.addEventListener('pageshow', function () {
    if (!battle_turn_flow.suspended) return;
    battle_turn_flow.suspended = false;
    // 后退恢复缓存页时只恢复尚未完成的等待，不重放已经执行的电脑行动。
    if (battle_turn_flow.phase === 'waiting') schedule_next_turn();
});
