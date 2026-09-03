import dns from "node:dns";

/**
 * Prefer IPv4 for every outbound connection made by this process.
 *
 * Container hosts commonly have no IPv6 route while DNS still returns AAAA records, so
 * Node picks an IPv6 address and the connection dies with ENETUNREACH after a long stall.
 * That is what silently broke signup email in production: smtp.gmail.com resolved to
 * 2a00:1450:… and the request hung until it timed out.
 *
 * Imported for its side effect by every module that talks to an outside service, so the
 * setting is applied before the first connection regardless of which one runs first.
 */
dns.setDefaultResultOrder("ipv4first");

export const preferIPv4 = true;
