# 欠席連絡データベース (Absence List Database) - セットアップガイド

このアプリは、スマートフォンから簡単に利用できる欠席連絡フォームです。
データはGoogleスプレッドシートに保存されます（無料・オンライン共有可能）。

## ステップ 1: ファイルの準備
このフォルダにある以下のファイルを使用します。
- `index.html`: アプリの本体
- `script.js`: アプリの動作プログラム
- `style.css`: デザイン設定
- `students.csv`, `teachers.csv`: 生徒・講師リストのサンプル

## ステップ 2: Googleスプレッドシートの準備 (バックエンド)
フォームのデータを受け取るために、Google Apps Scriptを作成します。

1. [Googleスプレッドシート](https://sheets.google.com)を新規作成します。
2. シート名を「Sheet1`」のままにします。
3. 1行目にヘッダーを入力します：
   `A1: タイムスタンプ`, `B1: 日付`, `C1: 時間`, `D1: 生徒名`, `E1: 生徒ID`, `F1: 講師名`, `G1: 講師ID`, `H1: 教科`

4. メニューの「拡張機能」 > 「Apps Script」をクリックします。
5. エディタが開いたら、以下のコードをコピーして貼り付けます（もともとあるコードは消してください）。

```javascript
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
  var params = e.parameter;
  
  var date = params.date;
  var finalTime = params.finalTime;
  var studentName = params.studentName; // "名前 (学年)"
  var studentId = params.studentSelect;
  var teacherName = params.teacherName; // "名前 (科目)"
  var teacherId = params.teacherSelect;
  var subject = params.subject;
  var timestamp = new Date();
  
  sheet.appendRow([timestamp, date, finalTime, studentName, studentId, teacherName, teacherId, subject]);
  
  return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
}
```

6. 「保存（フロッピーアイコン）」をクリックし、プロジェクト名を適当（例: AbsenceApp）にします。
7. 右上の「デプロイ」 > 「新しいデプロイ」をクリックします。
8. 「種類の選択」の歯車アイコン > 「ウェブアプリ」を選択します。
9. 設定を以下のようにします：
   - **説明**: 任意
   - **次のユーザーとして実行**: `自分`
   - **アクセスできるユーザー**: `全員` (これによりログインなしでフォーム送信が可能になります)
10. 「デプロイ」をクリックします。(アクセス承認画面が出たら許可します)
11. **ウェブアプリ URL** が表示されるので、コピーします。

## ステップ 3: アプリ設定の更新
1. パソコンにある `script.js` をメモ帳やエディタで開きます。
2. 3行目あたりにある `GAS_ENDPOINT_URL` の値を、先ほどコピーしたURLに書き換えて保存します。
   
   変更前:
   `const GAS_ENDPOINT_URL = 'YOUR_GAS_WEB_APP_URL_HERE';`
   
   変更後（例）:
   `const GAS_ENDPOINT_URL = 'https://script.google.com/macros/s/xxxxx.../exec';`

## ステップ 4: アプリの公開・共有 (Vercel)

このアプリをインターネット上で使えるように、**Vercel** を使って公開します。

### 1. GitHubへのアップロード
1. GitHubにログインし、新しいリポジトリ（例: `absence-list-app`）を作成します（Public/Privateどちらでも可）。
2. このフォルダ内のファイルをすべてアップロード（push）します。

### 2. Vercelへのデプロイ
1. [Vercel](https://vercel.com) にログイン（GitHubアカウントでログイン推奨）。
2. "Add New..." > "Project" をクリック。
3. 先ほど作成したGitHubリポジトリをインポートします。
4. 設定はデフォルトのままで "Deploy" をクリック。
5. デプロイが完了すると、自動的にURL（例: `https://absence-list-app.vercel.app`）が発行されます。

### 3. CSVファイルの更新について
- `students.csv` や `teachers.csv` を変更したい場合は、手元のファイルを編集してGitHubに再度プッシュしてください。Vercelが自動的に検知してサイトを更新します。


## ヒント
- 生徒や講師のリストを更新したい場合は、`students.csv` や `teachers.csv` を編集して再度アップロードしてください。
- フォーム画面から直接自分のスマホ内のCSVを読み込ませることも可能です。
