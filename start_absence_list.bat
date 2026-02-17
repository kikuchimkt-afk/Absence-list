@echo off
chcp 65001 > nul
echo 欠席連絡アプリ(Absence list)のサーバーを起動します...

:: アプリのディレクトリに移動
cd /d "c:\Users\makoto\Documents\アプリ開発\Absence list"

:: ブラウザを自動で開く（サーバー起動の少し後に開くようにpingでディレイ）
start "" "http://localhost:8082"

:: サーバー起動
echo サーバーを起動中... (ポート: 8082)
call npx -y http-server -p 8082 -c-1

pause
