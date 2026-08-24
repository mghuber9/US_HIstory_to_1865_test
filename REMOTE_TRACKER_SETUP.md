# Remote Tracker Setup

## Update the existing deployment

1. Open the existing Apps Script project attached to the tracker spreadsheet.
2. Replace the contents of `Code.gs` with `GOOGLE_APPS_SCRIPT.gs` from this repository and save.
3. Choose **Deploy → Manage deployments**, select the existing web-app deployment, and click **Edit**.
4. Under **Version**, choose **New version**. Keep **Execute as: Me** and **Who has access: Anyone**.
5. Click **Deploy**. This updates the existing deployment; the `/exec` URL does not change.
6. Open the existing `/exec` URL and confirm the health JSON reports `ok: true`.

The first real event will add headers only if a log sheet is empty. Existing Event_Log rows and its 19-column structure are preserved. Score_Log should use the 16 headers defined in the script; if it already has different headers, replace only its header row before testing.

## Dashboard formulas

Place labels in Dashboard column A and the following formulas in column B (Google Sheets syntax). These formulas assume the headers defined by the script and begin reading at row 2.

| Dashboard item | Formula |
| --- | --- |
| Last activity | `=IFERROR(MAX(Event_Log!A2:A),"")` |
| Latest test score | `=IFERROR(INDEX(SORT(FILTER({Score_Log!A2:A,Score_Log!K2:K&"/"&Score_Log!L2:L&" ("&TEXT(Score_Log!M2:M/100,"0%")&")"},Score_Log!H2:H="test"),1,FALSE),1,2),"")` |
| Overall accuracy | `=IFERROR(COUNTIF(Event_Log!M2:M,"correct")/(COUNTIF(Event_Log!M2:M,"correct")+COUNTIF(Event_Log!M2:M,"incorrect")),"")` |
| Questions attempted | `=COUNTIF(Event_Log!L2:L,"<>")` |
| Unique questions seen | `=COUNTUNIQUE(FILTER(Event_Log!G2:G&":"&Event_Log!L2:L,Event_Log!L2:L<>""))` |

For accuracy and coverage by section, put section IDs `1.1` through `4.2` in `A10:A17`, then use:

- Accuracy in B10, fill down: `=IFERROR(COUNTIFS(Event_Log!G:G,A10,Event_Log!M:M,"correct")/(COUNTIFS(Event_Log!G:G,A10,Event_Log!M:M,"correct")+COUNTIFS(Event_Log!G:G,A10,Event_Log!M:M,"incorrect")),"")`
- Unique coverage in C10, fill down: `=IFERROR(COUNTUNIQUE(FILTER(Event_Log!L:L,Event_Log!G:G=A10,Event_Log!L:L<>"")),0)`

Recent test attempts table: `=QUERY(Score_Log!A:P,"select A,J,K,L,M,N where H='test' order by A desc limit 10 label A 'When',J 'Attempt',K 'Correct',L 'Total',M 'Percent',N 'Seconds'",1)`

Recent activity table: `=QUERY(Event_Log!A:S,"select A,G,I,J,L,M where A is not null order by A desc limit 20 label A 'When',G 'Section',I 'Mode',J 'Event',L 'Question',M 'Result'",1)`

Format percentage cells as Percent and timestamp cells as Date time.

## Real-world verification

After deploying, open the GitHub Pages site, complete one Learn check and one 20-question test, then confirm Event_Log receives the events and Score_Log receives one `test_completed` row. Temporarily disconnect the device, answer a question, reconnect, and reload a page; the queued event should then appear once. Reposting an Event_ID manually should return `duplicate: true` and add no rows.
