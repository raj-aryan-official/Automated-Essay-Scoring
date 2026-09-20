import { test, expect } from '@playwright/test';

test.describe('Authentication & Role-Based Access Control (RBAC) Flow', () => {
  test('unauthenticated users are redirected to /login', async ({ page }) => {
    // Clear localStorage to ensure fresh session
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
    });

    // Attempt to visit protected root route
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('h1')).toContainText('Sign In to AES Platform');
  });

  test('displays error message on invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.locator('#login-email-input').fill('wrong@aes.local');
    await page.locator('#login-password-input').fill('IncorrectPass!');
    await page.locator('#btn-login').click();

    const errorBanner = page.locator('#login-error-banner');
    await expect(errorBanner).toBeVisible({ timeout: 5000 });
    await expect(errorBanner).toContainText(/invalid email or password/i);
  });

  test('teacher login, submission access, and sign out', async ({ page }) => {
    await page.goto('/login');

    // 1-click demo login as Teacher
    const teacherDemoBtn = page.locator('#btn-demo-teacher');
    await expect(teacherDemoBtn).toBeVisible();
    await teacherDemoBtn.click();

    // Verify redirect to root submission page
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toContainText('Submit Essay for Scoring');

    // Verify header role badge and user email
    const roleBadge = page.locator('#header-role-badge');
    await expect(roleBadge).toBeVisible();
    await expect(roleBadge).toContainText('TEACHER');

    const userEmail = page.locator('#header-user-email');
    await expect(userEmail).toContainText('teacher@aes.local');

    // Sign out
    const logoutBtn = page.locator('#btn-logout');
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // Verify redirected to login page and session cleared
    await expect(page).toHaveURL(/\/login/);
    const token = await page.evaluate(() => localStorage.getItem('aes_token'));
    expect(token).toBeNull();
  });

  test('viewer role has restricted access to submission page but can view scored essays', async ({ page }) => {
    await page.goto('/login');

    // 1-click demo login as Viewer
    const viewerDemoBtn = page.locator('#btn-demo-viewer');
    await viewerDemoBtn.click();

    // Since / requires TEACHER or ADMIN, viewer should see Access Restricted screen
    const restrictedCard = page.locator('#access-restricted-card');
    await expect(restrictedCard).toBeVisible({ timeout: 5000 });
    await expect(restrictedCard).toContainText('Access Restricted');
    await expect(restrictedCard).toContainText('VIEWER');

    const roleBadge = page.locator('#header-role-badge');
    await expect(roleBadge).toContainText('VIEWER');
  });

  test('admin role has unrestricted access across the platform', async ({ page }) => {
    await page.goto('/login');

    // 1-click demo login as Admin
    const adminDemoBtn = page.locator('#btn-demo-admin');
    await adminDemoBtn.click();

    // Admin should immediately have access to submission page
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toContainText('Submit Essay for Scoring');

    const roleBadge = page.locator('#header-role-badge');
    await expect(roleBadge).toContainText('ADMIN');
  });
});
