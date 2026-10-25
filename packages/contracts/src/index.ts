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
export const authenticatedUserSchema = z.object({ id: z.uuid(), email: z.email() });
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
export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>;
export type AuthenticatedUser = z.infer<typeof authenticatedUserSchema>;
export type AuthorizedWorkspace = z.infer<typeof authorizedWorkspaceSchema>;
export type Me = z.infer<typeof meSchema>;
export type WorkspaceContext = z.infer<typeof workspaceContextSchema>;
