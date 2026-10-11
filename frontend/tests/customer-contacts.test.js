import test from 'node:test';
import assert from 'node:assert/strict';
import { changeContact, emptyContacts, validateContacts, whatsAppNumber } from '../src/utils/customerContacts.js';
test('WhatsApp copia cada cambio del teléfono hasta editarlo',()=>{
 let form=changeContact(emptyContacts(),'Phone','656123');assert.equal(form.WhatsApp,'656123');
 form=changeContact(form,'Phone','6561234567');assert.equal(form.WhatsApp,form.Phone);
 form=changeContact(form,'WhatsApp','6567654321');form=changeContact(form,'Phone','6568888888');assert.equal(form.WhatsApp,'6567654321');
});
test('los campos faltantes o inválidos se identifican por nombre',()=>{
 assert.deepEqual(Object.keys(validateContacts(emptyContacts())),['FullName','Phone','WhatsApp']);
 assert.deepEqual(validateContacts({FullName:'Cliente',Phone:'+52 (656) 123-4567',WhatsApp:'6567654321'}),{});
 assert.ok(validateContacts({FullName:'Cliente',Phone:'abc',WhatsApp:'123'}).Phone);
});
test('los comprobantes usan WhatsApp y conservan teléfono como respaldo',()=>{
 assert.equal(whatsAppNumber({Phone:'6561111111',WhatsApp:'6562222222'}),'526562222222');
 assert.equal(whatsAppNumber({Phone:'6561111111'}),'526561111111');
 assert.equal(whatsAppNumber({WhatsApp:'+1 (915) 123-4567'}),'19151234567');
 assert.equal(whatsAppNumber({WhatsApp:'+52 656 222 2222'}),'526562222222');
 assert.equal(whatsAppNumber({Phone:'5211234567'}),'525211234567');
});
