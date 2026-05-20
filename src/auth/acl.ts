import type { Logger, RemoteUser, PackageAccess, AuthAccessCallback } from '@verdaccio/types';
import { getUnauthorized } from '@verdaccio/commons-api';
import type { UnpublishPackageAccess } from '../../types/UnpublishPackageAccess';
import { intersection } from '../helpers';

export function allowAccess(user: RemoteUser, pkg: PackageAccess, cb: AuthAccessCallback, logger: Logger): void {
  const groupsIntersection = intersection(user.groups, pkg?.access || []);
  if (pkg?.access?.includes(user.name ?? '') || groupsIntersection.length > 0) {
    logger.debug({ name: user.name }, '@{name} has been granted to access');
    cb(null, true);
  } else {
    logger.error({ name: user.name }, '@{name} is not allowed to access this package');
    cb(getUnauthorized('not authorized to access this package'), false);
  }
}

export function allowPublish(user: RemoteUser, pkg: PackageAccess, cb: AuthAccessCallback, logger: Logger): void {
  const groupsIntersection = intersection(user.groups, pkg?.publish || []);
  if (pkg?.publish?.includes(user.name ?? '') || groupsIntersection.length > 0) {
    logger.debug({ name: user.name }, '@{name} has been granted to publish');
    cb(null, true);
  } else {
    logger.error({ name: user.name }, '@{name} is not allowed to publish this package');
    cb(getUnauthorized('not authorized to publish this package'), false);
  }
}

export function allowUnpublish(
  user: RemoteUser,
  pkg: PackageAccess & UnpublishPackageAccess,
  cb: AuthAccessCallback,
  logger: Logger
): void {
  const groupsIntersection = intersection(user.groups, pkg?.unpublish || []);
  if (pkg?.unpublish?.includes(user.name ?? '') || groupsIntersection.length > 0) {
    logger.debug({ name: user.name }, '@{name} has been granted to unpublish');
    cb(null, true);
  } else {
    logger.error({ name: user.name }, '@{name} is not allowed to unpublish this package');
    cb(getUnauthorized('not authorized to unpublish this package'), false);
  }
}
