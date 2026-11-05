const { test } = require('node:test');
const assert = require('node:assert/strict');
const { screen, find, messages } = require('./screenHelper.cjs');

for (const [name, method] of [['RegisterScreen', 'requestInitialAccess'], ['ForgotPasswordScreen', 'requestPasswordReset']]) {
  test(`${name}: accepted request opens code entry with normalized email`, async () => {
    let email;
    const { render, navigation } = screen(name, { [method]: async (value) => { email = value; } });
    find(render(), 'TextInput').props.onChangeText('  ana@example.com  ');
    await find(render(), 'Button').props.onPress();
    assert.equal(email, 'ana@example.com');
    assert.equal(navigation.calls.length, 1);
    assert.equal(navigation.calls[0][0], 'ResetPassword');
    assert.equal(navigation.calls[0][1].email, 'ana@example.com');
    assert.equal(messages(render()).length, 0);
  });

  test(`${name}: send errors are inline and never navigate`, async () => {
    const { render, navigation } = screen(name, { [method]: async () => { throw new Error('Servicio no disponible'); } });
    find(render(), 'TextInput').props.onChangeText('ana@example.com');
    await find(render(), 'Button').props.onPress();
    assert.equal(messages(render())[0], 'Servicio no disponible');
    assert.equal(navigation.calls.length, 0);
    find(render(), 'TextInput').props.onChangeText('other@example.com');
    assert.equal(messages(render()).length, 0);
  });

  test(`${name}: empty and invalid emails prevent requests`, async () => {
    let calls = 0;
    const { render, navigation } = screen(name, { [method]: async () => { calls++; } });
    await find(render(), 'Button').props.onPress();
    assert.match(messages(render())[0], /correo/);
    find(render(), 'TextInput').props.onChangeText('invalid');
    await find(render(), 'Button').props.onPress();
    assert.equal(calls, 0);
    assert.equal(navigation.calls.length, 0);
    assert.match(messages(render())[0], /inválido/);
  });

  test(`${name}: pending request disables input and prevents duplicate sends`, async () => {
    let resolve;
    let calls = 0;
    const { render, navigation } = screen(name, { [method]: () => {
      calls++; return new Promise((done) => { resolve = done; });
    } });
    find(render(), 'TextInput').props.onChangeText('ana@example.com');
    const pending = find(render(), 'Button').props.onPress();
    assert.equal(find(render(), 'TextInput').props.disabled, true);
    assert.equal(find(render(), 'Button').props.disabled, true);
    await find(render(), 'Button').props.onPress();
    assert.equal(calls, 1);
    assert.equal(navigation.calls.length, 0);
    resolve(); await pending;
    assert.equal(find(render(), 'TextInput').props.disabled, false);
    assert.equal(navigation.calls.length, 1);
  });
}
