import type { NextRequest } from "next/server"

/**
 * Auth context for authenticated requests
 */
export interface AuthContext {
	userId: string
	teamId?: string
	isAuthenticated: boolean
}

/**
 * ⚠️  DEVELOPMENT ONLY AUTHENTICATION ⚠️
 *
 * This is a stub authentication system for development purposes only.
 *
 * SECURITY WARNING: This implementation is NOT suitable for production!
 * - Uses hardcoded user IDs
 * - No actual authentication/authorization
 * - No password verification
 * - No session management
 * - No JWT validation
 *
 * PRODUCTION REQUIREMENTS:
 * - Implement proper authentication (NextAuth.js, Clerk, Auth0, etc.)
 * - Use secure session management
 * - Validate all tokens and credentials
 * - Implement proper authorization checks
 * - Add rate limiting and security headers
 *
 * @param request - Next.js request object
 * @returns Auth context or null if not authenticated
 */
export async function getAuthContext(
	request: NextRequest,
): Promise<AuthContext | null> {
	// STUB: Replace with real auth logic
	// Example implementations:
	//
	// NextAuth:
	// const session = await getServerSession(authOptions);
	// if (!session?.user?.id) return null;
	// return {
	//   userId: session.user.id,
	//   teamId: session.user.teamId,
	//   isAuthenticated: true,
	// };
	//
	// JWT from header:
	// const token = request.headers.get('authorization')?.split(' ')[1];
	// if (!token) return null;
	// const decoded = await verifyJWT(token);
	// return {
	//   userId: decoded.sub,
	//   teamId: decoded.teamId,
	//   isAuthenticated: true,
	// };

	// Development stub: check for test header
	const testUserId = request.headers.get("x-user-id")
	const testTeamId = request.headers.get("x-team-id")

	if (testUserId) {
		return {
			userId: testUserId,
			teamId: testTeamId || undefined,
			isAuthenticated: true,
		}
	}

	// For development: allow unauthenticated with default user
	if (process.env.NODE_ENV === "development") {
		return {
			userId: "00000000-0000-0000-0000-000000000001", // Dev user ID
			isAuthenticated: true,
		}
	}

	// PRODUCTION WARNING: Stub auth should not be used in production
	if (process.env.NODE_ENV === "production") {
		console.error("🚨 SECURITY ALERT: Using stub authentication in production!")
		console.error(
			"🚨 This is a security vulnerability. Implement proper authentication immediately.",
		)
		// In production, we should fail closed for security
		return null
	}

	return null
}

/**
 * Require authentication and return user context
 * Throws 401 if not authenticated
 *
 * @param request - Next.js request object
 * @returns Auth context
 */
export async function requireAuth(request: NextRequest): Promise<AuthContext> {
	const auth = await getAuthContext(request)

	if (!auth) {
		throw new Error("Unauthorized")
	}

	return auth
}

/**
 * Check if user can access a filter based on ownership/visibility
 *
 * @param userId - Current user ID
 * @param filter - Filter object
 * @param teamId - Optional team ID
 * @returns True if user can access filter
 */
export function canAccessFilter(
	userId: string,
	filter: {
		ownerId: string
		teamId: string | null
		visibility: string
	},
	teamId?: string,
): boolean {
	// Owner can always access
	if (filter.ownerId === userId) {
		return true
	}

	// Public filters accessible to all
	if (filter.visibility === "public") {
		return true
	}

	// Team filters accessible to team members
	if (
		filter.visibility === "team" &&
		filter.teamId &&
		teamId === filter.teamId
	) {
		return true
	}

	return false
}

/**
 * Check if user can modify a filter (owner only)
 *
 * @param userId - Current user ID
 * @param filter - Filter object
 * @returns True if user can modify filter
 */
export function canModifyFilter(
	userId: string,
	filter: { ownerId: string },
): boolean {
	return filter.ownerId === userId
}
