<script lang="ts">
	import { goto } from '$app/navigation';
	import { login } from '$lib/api';
	import { auth, startSession } from '$lib/auth.svelte';

	let email = $state('');
	// Never trimmed. Whitespace is significant in a password (`LoginRequest`).
	let password = $state('');
	// Disables the button while a login is in flight. A double submit would
	// mint two live refresh tokens, since login never revokes earlier ones.
	// A1.4a.
	let submitting = $state(false);
	let error = $state<string | null>(null);

	// A1.7: when a failed refresh ended the last session, say why. Deactivation
	// must not read as an expired session, since signing in again will not help.
	function describeEnd(reason: string | null): string | null {
		if (reason === null) return null;
		if (reason === 'Account is deactivated') {
			return 'Your account has been deactivated — signing in again will not help.';
		}
		if (reason === 'Session expired') return 'Your session expired — sign in again.';
		return 'Your session ended — sign in again.';
	}

	const endedMessage = $derived(describeEnd(auth.endedReason));
	const message = $derived(error ?? endedMessage);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		submitting = true;
		error = null;
		const res = await login({ email, password });
		submitting = false;
		if (!res.ok) {
			// The API's messages are written for the user, e.g. "Incorrect email
			// or password", so they are shown exactly as they arrive.
			error = res.error.error;
			return;
		}
		startSession(res.data);
		goto('/dashboard');
	}
</script>

<div class="login-layout">
	<!-- Left Side - Branding -->
	<div class="login-side">
		<div class="login-side-content">
			<div class="login-logo">
				<i class="bi bi-files"></i>
				<span>EA QMS</span>
			</div>
			<h2>Quality Management System</h2>
			<p>
				Streamline change control processes and maintain compliance with enterprise-grade quality
				management.
			</p>
		</div>
	</div>

	<!-- Right Side - Login Form -->
	<div class="login-main">
		<div class="login-form-container">
			<div class="login-form-header">
				<h1>Sign In</h1>
				<p>Sign in to access EA QMS</p>
			</div>

			<form class="login-form" onsubmit={handleSubmit}>
				<!-- The prototype has no error element. `.esig-error` is the existing
				     global.css class used by the e-signature modals (decision 10). -->
				{#if message}
					<div class="esig-error show">{message}</div>
				{/if}

				<div class="form-group">
					<label for="email">Email Address</label>
					<input
						type="email"
						id="email"
						class="form-control"
						placeholder="name@company.com"
						autocomplete="email"
						required
						bind:value={email}
					/>
				</div>

				<div class="form-group">
					<label for="password">Password</label>
					<input
						type="password"
						id="password"
						class="form-control"
						placeholder="Enter your password"
						autocomplete="current-password"
						required
						bind:value={password}
					/>
				</div>

				<!-- The prototype's "Remember me" / "Forgot password?" row is dropped.
				     The API has no password reset, and the session lifetime is fixed
				     server-side (decision 11). -->

				<button type="submit" class="btn primary login-btn" disabled={submitting}>
					Sign In
				</button>
			</form>

			<div class="login-footer">
				<p>&copy; 2026 EA. All rights reserved.</p>
			</div>
		</div>
	</div>
</div>
