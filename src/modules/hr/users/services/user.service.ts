// Façade — re-exports types and combines query + mutation services
export type { UserWithRole, UserWithRoleAndTasks, ListUsersFilters, CreateUserInput, UpdateUserInput } from '../types';
export { userQueryService } from './user-query.service';
export { userMutationService } from './user-mutation.service';

// Unified service object for callers that expect a single userService
import { userQueryService } from './user-query.service';
import { userMutationService } from './user-mutation.service';

export const userService = {
  list:              userQueryService.list.bind(userQueryService),
  listForEmployee:   userQueryService.listForEmployee.bind(userQueryService),
  getById:           userQueryService.getById.bind(userQueryService),
  create:            userMutationService.create.bind(userMutationService),
  update:            userMutationService.update.bind(userMutationService),
  deactivate:        userMutationService.deactivate.bind(userMutationService),
  deleteHard:        userMutationService.deleteHard.bind(userMutationService),
  resetPassword:     userMutationService.resetPassword.bind(userMutationService),
  bulkDeactivate:           userMutationService.bulkDeactivate.bind(userMutationService),
  bulkActivate:             userMutationService.bulkActivate.bind(userMutationService),
  bulkChangeRole:           userMutationService.bulkChangeRole.bind(userMutationService),
  bulkSetMustChangePassword: userMutationService.bulkSetMustChangePassword.bind(userMutationService),
};
