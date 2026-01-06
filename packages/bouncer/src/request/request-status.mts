export const Switch = 101;
export const SwitchMsg = "Switching Protocols";
export const Success = 200;
export const SuccessMsg = "Success";
export const NotFound = 404;
export const NotFoundMsg = "Not Found";
export const BadGateway = 502;
export const BadGatewayMsg = "Bad Gateway";
export const Http = "HTTP/1.1";
export const Eol = "\r\n";
export const Eos = `${Eol}${Eol}`;

// Partial codes to overrides.  Anything not found in this map, should
// result in DefaultErrorCode
export const CodeToHttpError: Record<string, number> = {
  // Aborted - 499 isn't standard, but it's the most widely accepted
  // one we have for this case - see docs for NGINX
  AbortError: 499,
  ERR_REQUEST_ABORTED: 499,
  // Timeout - 504 - Sometimes you'll see odd errors with this one.
  ETIMEDOUT: 504,
  ESOCKETTIMEDOUT: 504,
  UND_ERR_CONNECT_TIMEOUT: 504,
  UND_ERR_HEADERS_TIMEOUT: 504,
  UND_ERR_BODY_TIMEOUT: 504,
  // Out of Resources - 503 Service Unavailable
  EMFILE: 503,
  ENFILE: 503,
  ENOMEM: 503,
  EAGAIN: 503,
};

// Most HttpVerbs allow a body, but these do not allow it,
// so we have to check to make sure that we don't forward
// any ghost bodies with them.
export const NoBodyVerbs = ["GET", "HEAD"];
