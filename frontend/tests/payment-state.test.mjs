import assert from 'node:assert/strict';
import test from 'node:test';
import { paymentStage } from '../src/payments/types.ts';

test('only server-confirmed credits show success, including after the timer ends', () => {
  assert.equal(paymentStage({ status: 'approved', creditsReleased: false }, 100), 'PENDING');
  assert.equal(paymentStage({ status: 'CREDITS_RELEASED', creditsReleased: true }, 0), 'APPROVED');
});

test('terminal and late payments never show a payable QR or success', () => {
  for (const [status, expected] of [['EXPIRED', 'EXPIRED'], ['CANCELLED', 'CANCELLED'], ['REJECTED', 'REJECTED'], ['PAID_LATE', 'REVIEW']]) {
    assert.equal(paymentStage({ status, creditsReleased: false }, 100), expected);
    assert.equal(paymentStage({ status, creditsReleased: false }, 0), expected);
  }
  assert.equal(paymentStage({ status: 'WAITING_PAYMENT', creditsReleased: false }, 0), 'EXPIRED');
});
