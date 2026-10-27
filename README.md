# blackwater
黑水詛咒AI版本 - Deployed by EZPage

遊戲網址：https://blackwater-weiyu168.pages.dev/

原 GitHub Pages 網址：https://weiyu168.github.io/blackwater/

效能回歸檢查：`node tests/performance.test.cjs`。涵蓋場景暫停、隱藏分頁、陰影更新、自動畫質與音樂載入。

手機建議橫向遊玩：左下圓盤可按上下左右或拖曳移動；右下「調查」與按住「快走」；拖動畫面可轉鏡頭。電腦維持原本鍵盤與滑鼠操作。

手機輸入回歸檢查：`node tests/mobile.test.cjs`。

人物已參考遊戲內解謎書，以 Blender 重製 12 位角色（含新增診所病人）。金河診所可進出，內有看診場景、家具及王金河醫師的行醫理念聊天；原有書桌、手寫稿及紀念館解謎仍保留。

人物檢視：`character-review.html`；靜音診所預覽：`clinic-review.html`。預覽使用獨立臨時進度。可編輯 Blender 檔與各人物 GLB 位於 `assets/characters/`，參考依據及重建指令見 `tools/art_sources.md`。

人物及診所回歸檢查：`node tests/characters.test.cjs`、`node tests/clinic.test.cjs`。
