import type { IZBouncerCertSecurity } from "./cert-security.mjs";
import { type IZBouncerCert } from "./cert.mjs";

export interface IZBouncerCertGenerator {
  generate(security: IZBouncerCertSecurity): Promise<IZBouncerCert>;
}
