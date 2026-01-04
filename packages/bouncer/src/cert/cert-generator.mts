import { type IZBouncerCert } from "./cert.mjs";

/**
 * Represents an factory that can generate a certificate.
 */
export interface IZBouncerCertGenerator {
  /**
   * Generates the appropriate bouncer certificate.
   */
  generate(): Promise<IZBouncerCert>;
}
