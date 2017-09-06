@Echo off
title waifucloud
:start
node waifu.js --no-warnings
if %ERRORLEVEL% NEQ 3 goto:start