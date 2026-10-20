import type { Patient } from "./lab-db"
import { getSettings } from "./settings"
import { formatPKR } from "./pricing"

export function printReceipt(patient: Patient) {
  const s = getSettings()
  const amount = patient.amount ?? 0
  const discount = patient.discount ?? 0
  const paid = patient.paid ?? 0
  const net = Math.max(0, amount - discount)
  const balance = Math.max(0, net - paid)

  const html = `<!doctype html><html><head><meta charset="utf-8">
  <title>Receipt ${patient.labNumber}</title>
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Courier New', ui-monospace, monospace; width: 72mm; margin: 0 auto; color: #000; }
    .center { text-align: center; }
    .big { font-size: 18px; font-weight: 800; letter-spacing: 2px; }
    .sub { font-size: 10px; color: #444; line-height: 1.5; }
    .hr { border-top: 1px dashed #000; margin: 8px 0; }
    table { width: 100%; font-size: 12px; border-collapse: collapse; }
    td { padding: 3px 0; vertical-align: top; }
    .right { text-align: right; }
    .tot { font-weight: 800; font-size: 14px; }
    .foot { text-align: center; font-size: 10px; margin-top: 12px; line-height: 1.6; }
    .badge { display: inline-block; border: 1px solid #000; padding: 1px 6px; font-size: 10px; }
  </style></head><body>
    <div class="center">
      <div class="big">${s.labName}</div>
      <div class="sub">${s.labSub}</div>
      <div class="sub">${s.phone}</div>
    </div>
    <div class="hr"></div>
    <table>
      <tr><td>Receipt #</td><td class="right">${patient.labNumber}</td></tr>
      <tr><td>Date</td><td class="right">${patient.date}</td></tr>
      <tr><td>Patient</td><td class="right">${patient.name}</td></tr>
      <tr><td>MRN</td><td class="right">${patient.mrn}</td></tr>
    </table>
    <div class="hr"></div>
    <table>
      <tr><td>Subtotal</td><td class="right">${formatPKR(amount)}</td></tr>
      ${discount > 0 ? `<tr><td>Discount</td><td class="right">- ${formatPKR(discount)}</td></tr>` : ""}
      <tr class="tot"><td>Net</td><td class="right">${formatPKR(net)}</td></tr>
      <tr><td>Paid</td><td class="right">${formatPKR(paid)}</td></tr>
      <tr class="tot"><td>Balance</td><td class="right">${formatPKR(balance)}</td></tr>
    </table>
    <div class="hr"></div>
    <div class="foot">
      ${balance === 0 ? '<div class="badge">PAID</div>' : '<div class="badge">UNPAID</div>'}
      <br/><br/>
      Thank you for choosing us.
      <br/>
      ${new Date().toLocaleString("en-GB")}
    </div>
  </body></html>`

  const w = window.open("", "_blank", "width=400,height=650")
  if (!w) return
  w.document.open()
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 400)
}