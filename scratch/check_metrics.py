import sqlite3
import json

conn = sqlite3.connect('backend/fluxv2x.db')
c = conn.cursor()
for mid in ['55e5476e', 'd13b1030', '5ddc2fbf', '4dd01940']:
    c.execute('SELECT id, name, metrics FROM experiments WHERE id LIKE ?', (mid + '%',))
    row = c.fetchone()
    if row:
        m = json.loads(row[2])
        cm = m.get('confusion_matrix', {})
        sm = m.get('split_metadata', {})
        print(f"{row[1]}:")
        print(f"  Train={m.get('train_samples')}, Test={m.get('test_samples')}")
        print(f"  CM: TN={cm.get('true_negative')}, FP={cm.get('false_positive')}, FN={cm.get('false_negative')}, TP={cm.get('true_positive')}")
        print(f"  Acc={m.get('accuracy')*100:.2f}%, Prec={m.get('precision')*100:.2f}%, Rec={m.get('recall')*100:.2f}%, F1={m.get('malicious_f1')*100:.2f}%, FPR={m.get('false_positive_rate')*100:.2f}%, FNR={m.get('false_negative_rate')*100:.2f}%")
        print(f"  Safeguards: {sm.get('leakage_safeguards')}")
