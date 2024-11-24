import { IZBouncerDomain } from "../config/config-domain.mjs";
import { IZBouncerSecurity } from "../config/config-security.mjs";
import { IZCert } from "./cert";

export interface IZCertGenerate {
  create(domain: IZBouncerDomain, options: IZBouncerSecurity): Promise<IZCert>;
}
