import { firstTruthy } from "@zthun/helpful-fn";
import type { ClientRequest, OutgoingHttpHeaders } from "node:http";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

export interface ForwardRequestOptions {
  method?: string;
  headers?: OutgoingHttpHeaders;
}

function isSecure(protocol: string) {
  return ["https:", "wss:"].includes(protocol);
}

export function forwardRequest(
  { protocol, port, hostname, pathname, search, host }: URL,
  { headers, method = "GET" }: ForwardRequestOptions = {},
): ClientRequest {
  const secure = isSecure(protocol);
  const proxy = secure ? httpsRequest : httpRequest;
  const defaultPort = secure ? 443 : 80;
  const _port = firstTruthy(defaultPort, Number(port));

  return proxy({
    hostname,
    port: _port,
    path: `${pathname}${search}`,
    method,
    headers: {
      ...headers,
      host,
    },
  });
}
