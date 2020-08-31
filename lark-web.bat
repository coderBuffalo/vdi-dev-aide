@echo off
taskkill /f /t /fi "windowtitle eq lark-web"

title lark-web
node index.js
