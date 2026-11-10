import test from 'node:test';
import assert from 'node:assert/strict';
import {renderForm} from '../scripts/forms.mjs';
import {esc} from '../scripts/build.mjs';
const settings={contact_email:'info@primalresetretreats.com',contact_form_provider:'formsubmit',site_url:'https://primalresetretreats-com.pages.dev'};
test('retreat form sends to the intended inbox with age, country and native spam protection',()=>{
 const html=renderForm('retreat',settings,{esc});
 assert.match(html,/action="https:\/\/formsubmit.co\/info@primalresetretreats.com" method="POST"/);
 assert.match(html,/name="age" type="number" required[^>]*min="29" max="60" step="1"/);
 assert.match(html,/name="country" type="text" required[^>]*autocomplete="country-name"/);
 assert.match(html,/name="_honey"/);assert.doesNotMatch(html,/name="_captcha"/);
 assert.match(html,/name="_next" value="https:\/\/primalresetretreats-com.pages.dev\/thank-you\/"/);
 assert.doesNotMatch(html,/<button[^>]*disabled/);
});
test('coach form collects country but does not apply participant age restrictions',()=>{
 const html=renderForm('coach',settings,{esc});assert.match(html,/name="country"/);assert.doesNotMatch(html,/name="age"/);
 assert.match(html,/Send application/);
});
test('existing Formspree endpoints still take precedence over the new fallback',()=>{
 const html=renderForm('retreat',{...settings,retreat_form_id:'test123'},{esc});
 assert.match(html,/data-provider="formspree"/);assert.match(html,/action="https:\/\/formspree.io\/f\/test123"/);assert.doesNotMatch(html,/name="_honey"/);
});
test('without a configured service the submit button stays disabled and direct email remains available',()=>{
 const html=renderForm('retreat',{...settings,contact_form_provider:'disabled'},{esc});
 assert.match(html,/<button[^>]*disabled/);assert.match(html,/mailto:info@primalresetretreats.com/);
});
