import { NextResponse } from 'next/server';
import { createProject, listProjects } from '@xsite/db';
import type { WebsiteType } from '@xsite/core';
import { resolveMembershipContext } from '@/lib/auth/request-context';
import { toErrorResponse } from '@/lib/api-errors';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ organizationId: string }> },
): Promise<NextResponse> {
  try {
    const { organizationId } = await params;
    const ctx = await resolveMembershipContext(organizationId);
    const projects = await listProjects(ctx.organization.id);
    return NextResponse.json({ projects });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ organizationId: string }> },
): Promise<NextResponse> {
  try {
    const { organizationId } = await params;
    const ctx = await resolveMembershipContext(organizationId);
    const body = (await request.json()) as { name?: string; websiteType?: WebsiteType };
    if (!body.name || !body.websiteType) {
      return NextResponse.json({ error: { code: 'invalid_body', message: 'name and websiteType are required.' } }, { status: 422 });
    }
    const project = await createProject({
      organizationId: ctx.organization.id,
      name: body.name,
      websiteType: body.websiteType,
      createdByUserId: ctx.user.id,
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
