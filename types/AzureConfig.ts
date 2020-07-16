import { Config } from '@verdaccio/types';

export interface AzureConfig extends Config {
  tenant: string; // required
  client_id: string; // required
  client_secret: string; // required
  organization_domain: string; // optional
  scope: string; // optional
  allow_groups: Array<string>; // optional
}
