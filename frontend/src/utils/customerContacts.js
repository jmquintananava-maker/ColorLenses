export const emptyContacts = () => ({ FullName: '', Phone: '', WhatsApp: '', whatsAppEdited: false });

export function changeContact(form, name, value) {
  if (name === 'Phone') return { ...form, Phone: value, WhatsApp: form.whatsAppEdited ? form.WhatsApp : value };
  if (name === 'WhatsApp') return { ...form, WhatsApp: value, whatsAppEdited: true };
  return { ...form, [name]: value };
}

export function validateContacts(form) {
  const errors = {};
  if (!form.FullName.trim()) errors.FullName = 'Escribe el nombre completo.';
  else if (form.FullName.trim().length > 150) errors.FullName = 'Usa hasta 150 caracteres.';
  for (const name of ['Phone', 'WhatsApp']) {
    const value = form[name].trim();
    const label = name === 'Phone' ? 'teléfono' : 'WhatsApp';
    if (!value) errors[name] = `Escribe el número de ${label}.`;
    else if (value.length > 30 || !/^[+\d\s().-]+$/.test(value) || !/^\d{7,15}$/.test(value.replace(/\D/g, ''))) errors[name] = 'Usa un número de 7 a 15 dígitos; puedes incluir el código de país.';
  }
  return errors;
}

export function whatsAppNumber(customer) {
  const number = String(customer?.WhatsApp || customer?.Phone || '').replace(/\D/g, '');
  return number.length === 10 ? `52${number}` : number;
}
