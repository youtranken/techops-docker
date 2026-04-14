import { notFound } from 'next/navigation';

/**
 * Permissions page has been removed.
 * Task flow permissions are now fully hardcoded via taskActionMatrix.ts.
 * This route returns 404 to prevent accidental access.
 */
export default function UserPermissionsPage() {
  notFound();
}
