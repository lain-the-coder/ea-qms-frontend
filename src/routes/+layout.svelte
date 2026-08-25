<script lang="ts">
	// Both are Vite CSS imports, not Svelte styling: they are emitted as plain
	// global stylesheets, so no scoping and no hashed class names. That is why the
	// prototypes' classes keep working verbatim and why `:global` is never needed
	// (blueprint B3).
	//
	// `global.css` is imported last so it wins any conflict — it is the authority
	// on everything visual (B1: the prototypes define every screen).
	import 'bootstrap-icons/font/bootstrap-icons.css';
	import '$lib/global.css';

	let { children } = $props();
</script>

{@render children()}
