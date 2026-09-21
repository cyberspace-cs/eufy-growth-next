#!/usr/bin/env bash
# ============================================================
# 回归测试：post-receive 的「调用约定」
#
# 用同一份「第 2 步必然失败」的 run()，只改调用方式，跑三个用例：
#
#   A 原始写法  if out="$(run 2>&1)"; then
#       → 条件上下文关闭了函数体内的 set -e
#       → 假成功 + 已执行上线副作用          【最危险】
#
#   B 半步修复  set +e; run >"$out" 2>&1; rc=$?; set -e
#       → 副作用不会发生了（方向对了），但 run 内部的 set -e 会泄漏，
#         脚本在调用点当场退出 → 失败提示和日志回显全都打印不出来
#       → 失败但不解释                        【安全但不可用】
#
#   C 正确写法  set +e; ( run ) >"$out" 2>&1; rc=$?; set -e
#       → 副作用不发生 + rc 正确 + 失败原因能打印出来
#       → 安全且可诊断                        【期望状态】
#
# 哪天 C 的断言挂了，说明调用点又被改回去了，别放过。
# ============================================================
set -uo pipefail

ROOT="$(mktemp -d)"
trap 'rm -rf "$ROOT"' EXIT

# 生成一份「共用同一个 run()，只换调用点」的脚本
gen() {
  local file="$1" caller="$2"
  {
    echo '#!/usr/bin/env bash'
    echo 'set -uo pipefail'
    cat <<'EOS'
run() {
  set -e
  echo "步骤1 npm ci 成功"
  false                      # ← 模拟构建失败
  echo "步骤2 构建成功（本不该被执行）"
  touch "$SIDE_EFFECT"       # ← 模拟 rsync 把旧产物同步上线
  echo "步骤3 已同步上线"
}
EOS
    echo 'set +e'
    case "$caller" in
      A) echo 'if out="$(run 2>&1)"; then rc=0; else rc=1; fi; printf "%s\n" "$out"; set -e' ;;
      B) echo 'run >"$OUTF" 2>&1; rc=$?; set -e; cat "$OUTF"' ;;
      C) echo '( run ) >"$OUTF" 2>&1; rc=$?; set -e; cat "$OUTF"' ;;
    esac
    echo 'if [ "$rc" -eq 0 ]; then'
    echo '  echo "DIAG=✔ 部署成功（假）"; exit 0'
    echo 'else'
    echo '  echo "DIAG=✘ 部署失败（线上保持原版本未受影响）"; exit 1'
    echo 'fi'
  } > "$file"
  chmod +x "$file"
}

gen "$ROOT/A.sh" A
gen "$ROOT/B.sh" B
gen "$ROOT/C.sh" C

fails=0
check() {
  local script="$1" label="$2" want_rc="$3" want_side="$4" want_diag="$5"
  export SIDE_EFFECT="$ROOT/side-$(basename "$script" .sh)"
  export OUTF="$ROOT/out-$(basename "$script" .sh)"
  rm -f "$SIDE_EFFECT" "$OUTF"

  local out rc side diag ok=1
  out="$(bash "$script" 2>&1)"; rc=$?
  [ -e "$SIDE_EFFECT" ] && side=yes || side=no
  # 取出 DIAG 那一行的内容（没有就是 NONE）
  diag="$(printf '%s\n' "$out" | sed -n 's/^.*DIAG=//p')"
  [ -n "$diag" ] || diag=NONE

  [ "$rc" = "$want_rc" ] || ok=0
  [ "$side" = "$want_side" ] || ok=0
  [ "$diag" = "$want_diag" ] || ok=0

  echo "───── $label ─────"
  printf '%s\n' "$out" | grep -v '^$' | sed 's/^/    /'
  printf '    退出码=%s(期望%s)  上线副作用=%s(期望%s)\n' "$rc" "$want_rc" "$side" "$want_side"
  printf '    末尾提示="%s"\n              期望="%s"   %s\n\n' \
    "$diag" "$want_diag" "$( [ "$ok" = 1 ] && echo '✔' || echo '✘ 与预期不符' )"
  [ "$ok" = 1 ] || fails=$((fails + 1))
}

check "$ROOT/A.sh" "A 原始写法 · if 条件"  0 yes "✔ 部署成功（假）"
check "$ROOT/B.sh" "B 半步修复 · 裸调 run" 1 no  "NONE"
check "$ROOT/C.sh" "C 正确写法 · 子 shell" 1 no  "✘ 部署失败（线上保持原版本未受影响）"

if [ "$fails" -eq 0 ]; then
  echo "[PASS] 调用约定回归测试通过（3/3）"
  exit 0
fi
echo "[FAIL] $fails 个用例不符合预期"
exit 1
