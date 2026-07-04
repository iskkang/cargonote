import { useEffect, useState } from 'react';
import type { AdminRepo, NewCustomer } from './repo';
import type { Customer } from '../domain/types';
import { Card, Button, Field, EmptyState, inputStyle } from '../ui/kit';
import { useConfirm, useToast } from '../ui/overlays';
import { useT } from './i18n';
import { C } from '../ui/tokens';

const EMPTY: NewCustomer = { name: '', contactName: '', phone: '', email: '' };

export function CustomerManager({ repo }: { repo: AdminRepo }) {
  const t = useT();
  const confirm = useConfirm();
  const toast = useToast();
  const [list, setList] = useState<Customer[]>([]);
  const [form, setForm] = useState<NewCustomer>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() { setList(await repo.listCustomers()); }
  useEffect(() => { refresh(); }, [repo]);

  function edit(c: Customer) {
    setEditingId(c.id);
    setForm({ name: c.name, contactName: c.contactName ?? '', phone: c.phone ?? '', email: c.email ?? '' });
    setError(null);
  }
  function reset() { setEditingId(null); setForm(EMPTY); setError(null); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input: NewCustomer = {
      name: form.name.trim(),
      contactName: form.contactName?.trim() || null,
      phone: form.phone?.trim() || null,
      email: form.email?.trim() || null,
    };
    if (!input.name) { setError(t.customer.nameRequired); return; }
    if (editingId) { await repo.updateCustomer(editingId, input); toast(t.customer.updated, 'positive'); }
    else { await repo.createCustomer(input); toast(t.customer.added, 'positive'); }
    reset();
    await refresh();
  }

  async function remove(c: Customer) {
    const ok = await confirm({ title: t.customer.delTitle, message: t.customer.delMsg(c.name), confirmLabel: t.common.delete, danger: true });
    if (!ok) return;
    setError(null);
    try { await repo.deleteCustomer(c.id); await refresh(); toast(t.customer.deleted, 'positive'); }
    catch { setError(t.customer.blocked); }
  }

  return (
    <div>
      {error && <div style={{ color: C.negative, fontSize: 13, marginBottom: 12 }}>{error}</div>}
      {list.length === 0 ? (
        <EmptyState title={t.customer.empty} hint={t.customer.emptyHint} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
          {list.map((c) => (
            <div key={c.id} data-testid="customer-row" className="cn-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: C.white, border: `1px solid ${C.line}`, borderRadius: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 600, color: C.navy }}>{c.name}</div>
                <div style={{ fontSize: 12, color: C.text, marginTop: 2 }}>
                  {[c.contactName, c.phone, c.email].filter(Boolean).join(' · ') || t.customer.noContact}
                </div>
              </div>
              <Button variant="ghost" onClick={() => edit(c)} style={{ padding: '5px 10px' }}>{t.common.edit}</Button>
              <Button variant="ghost" onClick={() => remove(c)} style={{ padding: '5px 10px' }}>{t.common.delete}</Button>
            </div>
          ))}
        </div>
      )}
      <Card>
        <div style={{ fontWeight: 700, color: C.navy, marginBottom: 10 }}>{editingId ? t.customer.edit : t.customer.add}</div>
        <form onSubmit={submit} style={{ maxWidth: 420 }}>
          <Field label={t.customer.name}><input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label={t.customer.contact}><input style={inputStyle} value={form.contactName ?? ''} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></Field>
          <Field label={t.customer.phone}><input style={inputStyle} value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label={t.customer.email}><input type="email" style={inputStyle} value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="submit">{editingId ? t.common.save : t.common.add}</Button>
            {editingId && <Button variant="ghost" onClick={reset}>{t.common.cancel}</Button>}
          </div>
        </form>
      </Card>
    </div>
  );
}
