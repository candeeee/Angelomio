import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getSecret() {
  const secret = process.env.ORDER_CONFIRMATION_SECRET;
  if (!secret) throw new Error("Falta ORDER_CONFIRMATION_SECRET para confirmar pedidos de invitados.");
  return secret;
}

export function getOrderConfirmationCookieName(orderId: string) {
  return `angelo-mio-order-confirmation-${orderId}`;
}

export function createOrderConfirmationToken(orderId: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = `${orderId}.${expiresAt}`;
  const signature = createHmac("sha256", getSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function isValidOrderConfirmationToken(orderId: string, token?: string) {
  if (!token) return false;

  const [tokenOrderId, expiresAt, signature] = token.split(".");
  if (!tokenOrderId || !expiresAt || !signature || tokenOrderId !== orderId) return false;
  if (!Number.isInteger(Number(expiresAt)) || Number(expiresAt) < Math.floor(Date.now() / 1000)) return false;

  const payload = `${tokenOrderId}.${expiresAt}`;
  const expected = createHmac("sha256", getSecret()).update(payload).digest("base64url");
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

export { MAX_AGE_SECONDS as ORDER_CONFIRMATION_MAX_AGE_SECONDS };
