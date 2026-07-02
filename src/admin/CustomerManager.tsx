import { useEffect, useState } from 'react';
import type { AdminRepo, NewCustomer } from './repo';
import type { Customer } from '../domain/types';
import { Card, Button, Field, EmptyState, inputStyle } from '../ui/kit';
import { C } from '../ui/tokens';

const EMPTY: NewCustomer = { name: '', contactName: '', phone: '', email: '' };

export function CustomerManager({ repo }: { repo: AdminRepo }) {
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
    if (!input.name) { setError('거래처명을 입력하세요.'); return; }
    if (editingId) await repo.updateCustomer(editingId, input);
    else await repo.createCustomer(input);
    reset();
    await refresh();
  }

  async function remove(c: Customer) {
    if (!window.confirm(`'${c.name}' 거래처를 삭제할까요?`)) return;
    setError(null);
    try { await repo.deleteCustomer(c.id); await refresh(); }
    catch { setError('이 거래처로 만든 작업이 있어 삭제할 수 없습니다.'); }
  }

  return (
    <div>
      <h2 style={{ fontSize: 17, color: C.navy, margin: '4px 0 14px' }}>거래처 관리</h2>
      {error && <div style={{ color: C.negative, fontSize: 13, marginBottom: 12 }}>{error}</div>}
      {list.length === 0 ? (
        <EmptyState title="등록된 거래처가 없습니다" hint="아래에서 첫 거래처를 추가하세요." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
          {list.map((c) => (
            <div key={c.id} data-testid="customer-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: C.white, border: `1px solid ${C.line}`, borderRadius: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: C.navy }}>{c.name}</div>
                <div style={{ fontSize: 12, color: C.text, marginTop: 2 }}>
                  {[c.contactName, c.phone, c.email].filter(Boolean).join(' · ') || '연락처 없음'}
                </div>
              </div>
              <Button variant="ghost" onClick={() => edit(c)} style={{ padding: '5px 10px' }}>수정</Button>
              <Button variant="ghost" onClick={() => remove(c)} style={{ padding: '5px 10px' }}>삭제</Button>
            </div>
          ))}
        </div>
      )}
      <Card>
        <div style={{ fontWeight: 700, color: C.navy, marginBottom: 10 }}>{editingId ? '거래처 수정' : '거래처 추가'}</div>
        <form onSubmit={submit} style={{ maxWidth: 420 }}>
          <Field label="거래처명"><input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="담당자"><input style={inputStyle} value={form.contactName ?? ''} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></Field>
          <Field label="전화번호"><input style={inputStyle} value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="이메일"><input type="email" style={inputStyle} value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="submit">{editingId ? '저장' : '추가'}</Button>
            {editingId && <Button variant="ghost" onClick={reset}>취소</Button>}
          </div>
        </form>
      </Card>
    </div>
  );
}
