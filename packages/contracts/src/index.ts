import { z } from 'zod';
export const healthSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('windops-api'),
});
export const errorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string(), requestId: z.string() }),
});
export type Health = z.infer<typeof healthSchema>;
export type ApiError = z.infer<typeof errorSchema>;

export const workspaceRoleSchema = z.enum(['admin', 'technician']);
export const authenticatedUserSchema = z
  .object({
    id: z.uuid(),
    email: z.email(),
    name: z.string(),
  })
  .strict();
export const authorizedWorkspaceSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  role: workspaceRoleSchema,
});
export const meSchema = z.object({
  user: authenticatedUserSchema,
  workspaces: z.array(authorizedWorkspaceSchema),
});
export const workspaceContextSchema = z.object({
  workspace: z.object({ id: z.uuid(), name: z.string().min(1) }),
  role: workspaceRoleSchema,
});
export const authProvidersSchema = z.object({ google: z.boolean() });

export const workspaceInvitationDeliveryStatusSchema = z.enum(['pending', 'sent', 'failed']);
export const workspaceInvitationStatusSchema = z.enum([
  'pending',
  'expired',
  'accepted',
  'revoked',
  'superseded',
  'delivery_failed',
]);
export const workspaceInvitationSchema = z
  .object({
    id: z.uuid(),
    email: z.email(),
    role: workspaceRoleSchema,
    status: workspaceInvitationStatusSchema,
    deliveryStatus: workspaceInvitationDeliveryStatusSchema,
    createdAt: z.iso.datetime(),
    expiresAt: z.iso.datetime(),
    sentAt: z.iso.datetime().nullable(),
  })
  .strict();
export const workspaceInvitationsPageSchema = z.object({
  items: z.array(workspaceInvitationSchema),
  nextCursor: z.uuid().nullable(),
});
export const workspaceListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(25),
    cursor: z.uuid().optional(),
    search: z.string().trim().min(1).max(320).optional(),
  })
  .strict();
export const workspaceMembersQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(25),
    cursor: z.uuid().optional(),
  })
  .strict();
export const createWorkspaceInvitationSchema = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email()),
    role: workspaceRoleSchema.default('technician'),
  })
  .strict();
export const acceptWorkspaceInvitationSchema = z
  .object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) })
  .strict();
export const updateWorkspaceMemberRoleSchema = z.object({ role: workspaceRoleSchema }).strict();
export const workspaceMemberSchema = z
  .object({
    membershipId: z.uuid(),
    user: authenticatedUserSchema,
    role: workspaceRoleSchema,
    createdAt: z.iso.datetime(),
    revokedAt: z.iso.datetime().nullable(),
  })
  .strict();
export const workspaceMembersPageSchema = z
  .object({
    items: z.array(workspaceMemberSchema),
    nextCursor: z.uuid().nullable(),
  })
  .strict();
export const workspaceDirectoryAccountSchema = z
  .object({
    ...authenticatedUserSchema.shape,
    createdAt: z.iso.datetime(),
  })
  .strict();
export const workspaceDirectoryPageSchema = z
  .object({
    items: z.array(workspaceDirectoryAccountSchema),
    nextCursor: z.uuid().nullable(),
  })
  .strict();

export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>;
export type AuthenticatedUser = z.infer<typeof authenticatedUserSchema>;
export type AuthorizedWorkspace = z.infer<typeof authorizedWorkspaceSchema>;
export type Me = z.infer<typeof meSchema>;
export type WorkspaceContext = z.infer<typeof workspaceContextSchema>;
export type AuthProviders = z.infer<typeof authProvidersSchema>;
export type WorkspaceInvitation = z.infer<typeof workspaceInvitationSchema>;
export type WorkspaceInvitationDeliveryStatus = z.infer<
  typeof workspaceInvitationDeliveryStatusSchema
>;
export type WorkspaceInvitationStatus = z.infer<typeof workspaceInvitationStatusSchema>;
export type CreateWorkspaceInvitation = z.infer<typeof createWorkspaceInvitationSchema>;
export type AcceptWorkspaceInvitation = z.infer<typeof acceptWorkspaceInvitationSchema>;
export type WorkspaceMember = z.infer<typeof workspaceMemberSchema>;
export type WorkspaceMembersPage = z.infer<typeof workspaceMembersPageSchema>;
export type WorkspaceDirectoryAccount = z.infer<typeof workspaceDirectoryAccountSchema>;
export type WorkspaceDirectoryPage = z.infer<typeof workspaceDirectoryPageSchema>;
export type WorkspaceListQuery = z.infer<typeof workspaceListQuerySchema>;
export type WorkspaceMembersQuery = z.infer<typeof workspaceMembersQuerySchema>;
