import { useRef, useState } from 'react';
import Modal from '../Modal';
import { request, uuid } from '../../utils/api';
import { changeContact, emptyContacts, validateContacts } from '../../utils/customerContacts';

export default function CustomerCreateModal({ onClose, onCreated }) {
  const [form, setForm] = useState(emptyContacts);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const requestKey = useRef(null);
  const saving = useRef(false);
  const formRef = useRef(null);

  const focusError = fields => requestAnimationFrame(() => formRef.current?.elements.namedItem(Object.keys(fields)[0])?.focus());
  const change = event => {
    const { name, value } = event.target;
    setForm(current => changeContact(current, name, value));
    setErrors(current => ({ ...current, [name]: '', ...(name === 'Phone' && !form.whatsAppEdited ? { WhatsApp: '' } : {}) }));
    setMessage('');
  };
  const submit = async event => {
    event.preventDefault();
    if (saving.current) return;
    const invalid = validateContacts(form);
    setErrors(invalid);
    if (Object.keys(invalid).length) { focusError(invalid); return; }
    saving.current = true;
    setBusy(true);
    setMessage('');
    try {
      requestKey.current ||= uuid();
      const { customer } = await request('/api/customers/quick', { method: 'POST', body: {
        FullName: form.FullName.trim(), Phone: form.Phone.trim(), WhatsApp: form.WhatsApp.trim(), RequestKey: requestKey.current
      } });
      if (!customer?.Id) throw new Error('No se recibió el cliente creado. Vuelve a intentar guardar.');
      onCreated(customer);
    } catch (error) {
      if (['FullName', 'Phone', 'WhatsApp'].includes(error.details?.field)) {
        const invalid = { [error.details.field]: error.message };
        setErrors(invalid); focusError(invalid);
      } else setMessage(error.message || 'No se pudo guardar el cliente. Vuelve a intentar.');
    } finally { saving.current = false; setBusy(false); }
  };

  return <Modal title="Agregar cliente" onClose={onClose} busy={busy} className="cl-customer-modal">
    <form ref={formRef} className="cl-customer-form" onSubmit={submit} noValidate>
      {message && <div className="cl-alert cl-alert-error" role="alert">{message}</div>}
      <p className="cl-customer-defaults">Activo · Silver · 0 puntos</p>
      {[
        ['FullName', 'Nombre completo', 'text', 'name'],
        ['Phone', 'Teléfono', 'tel', 'tel'],
        ['WhatsApp', 'WhatsApp', 'tel', 'off']
      ].map(([name, label, type, autoComplete]) => <div className="cl-customer-field" key={name}>
        <label htmlFor={`new-customer-${name}`}>{label}</label>
        <input id={`new-customer-${name}`} name={name} type={type} inputMode={type === 'tel' ? 'tel' : undefined}
          autoComplete={autoComplete} autoFocus={name === 'FullName'} required maxLength={name === 'FullName' ? 150 : 30}
          value={form[name]} disabled={busy} onChange={change} aria-invalid={!!errors[name]}
          aria-describedby={errors[name] ? `new-customer-${name}-error` : name === 'WhatsApp' ? 'new-customer-whatsapp-help' : undefined}/>
        {errors[name] && <p className="cl-field-error" id={`new-customer-${name}-error`} role="alert">{errors[name]}</p>}
        {name === 'WhatsApp' && <div id="new-customer-whatsapp-help" className="cl-customer-help">
          <span>Se copia del teléfono. Puedes cambiarlo si es diferente.</span>
          {form.whatsAppEdited && <button type="button" disabled={busy} className="cl-text-btn" onClick={() => {
            setForm(current => ({ ...current, WhatsApp: current.Phone, whatsAppEdited: false }));
            setErrors(current => ({ ...current, WhatsApp: '' }));
          }}>Usar mismo teléfono</button>}
        </div>}
      </div>)}
      <div className="cl-customer-form-actions">
        <button className="cl-btn cl-btn-secondary" type="button" disabled={busy} onClick={onClose}>Cancelar</button>
        <button className="cl-btn cl-btn-primary" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cliente'}</button>
      </div>
    </form>
  </Modal>;
}
