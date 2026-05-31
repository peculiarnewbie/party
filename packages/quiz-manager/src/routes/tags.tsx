// @ts-nocheck
import { createFileRoute } from "@tanstack/solid-router";
import { createSignal, createResource, For, Show } from "solid-js";
import { listTags, createTag, deleteTag } from "~/server/quiz-fns";

export const Route = createFileRoute("/tags")({
    component: TagsPage,
});

function TagsPage() {
    const [tags, { refetch }] = createResource(() => listTags());
    const [newName, setNewName] = createSignal("");
    const [creating, setCreating] = createSignal(false);
    const [error, setError] = createSignal<string | null>(null);
    const [deleting, setDeleting] = createSignal<string | null>(null);

    async function handleCreate(e: Event) {
        e.preventDefault();
        if (!newName().trim()) return;
        setCreating(true);
        setError(null);
        try {
            await createTag({ data: newName().trim() });
            setNewName("");
            refetch();
        } catch (err: any) {
            setError(err?.message ?? "Failed to create tag");
        } finally {
            setCreating(false);
        }
    }

    async function handleDelete(id: string, name: string) {
        if (!confirm(`Delete tag "${name}"?`)) return;
        setDeleting(id);
        try {
            await deleteTag({ data: id });
            refetch();
        } finally {
            setDeleting(null);
        }
    }

    return (
        <div class="min-h-screen bg-[#f5f0e8] font-karla">
            <header class="bg-[#1a3a6e] text-[#ddd5c4] px-8 py-5 flex items-center gap-4">
                <a href="/" class="font-bebas text-sm tracking-widest text-[#b8ae9e] hover:text-[#ddd5c4] transition-colors">BACK</a>
                <h1 class="font-bebas text-3xl tracking-wide">Tag Management</h1>
            </header>

            <main class="max-w-xl mx-auto px-6 py-10">
                <form onSubmit={handleCreate} class="mb-8">
                    <div class="flex gap-3">
                        <input type="text" value={newName()} onInput={(e) => setNewName(e.currentTarget.value)}
                            placeholder="New tag name"
                            class="flex-1 px-4 py-3 bg-white border-2 border-[#b8ae9e] font-karla text-[#1a1a1a] focus:border-[#1a3a6e] outline-none transition-colors" />
                        <button type="submit" disabled={creating() || !newName().trim()}
                            class="font-bebas text-lg tracking-wide bg-[#1a3a6e] text-[#ddd5c4] px-6 py-3 border-2 border-[#1a1a1a] shadow-[3px_3px_0_#1a1a1a] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1a1a1a] transition-all disabled:opacity-40 disabled:shadow-none disabled:transform-none cursor-pointer">
                            {creating() ? "..." : "Add"}
                        </button>
                    </div>
                    <Show when={error()}><p class="text-[#c0261a] text-sm mt-2">{error()}</p></Show>
                </form>

                <Show when={!tags.loading} fallback={<div class="text-center text-[#7a7060] font-bebas text-xl tracking-wide py-10">Loading...</div>}>
                    <Show when={tags() && tags()!.length > 0} fallback={<div class="text-center py-10"><p class="text-[#7a7060] font-bebas text-lg tracking-wide">No tags yet</p></div>}>
                        <div class="bg-white border-2 border-[#1a1a1a] shadow-[4px_4px_0_#1a1a1a]">
                            <For each={tags()}>
                                {(tag: any) => (
                                    <div class="flex items-center justify-between px-5 py-3 border-b border-[#e5dfd5] last:border-b-0 hover:bg-[#f9f5ef] transition-colors">
                                        <div>
                                            <span class="font-bebas text-lg text-[#1a1a1a]">{tag.name}</span>
                                            <span class="text-xs text-[#9a9080] ml-2">{tag.quizCount} quiz{tag.quizCount !== 1 ? "zes" : ""}</span>
                                        </div>
                                        <button onClick={() => handleDelete(tag.id, tag.name)} disabled={deleting() === tag.id}
                                            class="font-bebas text-xs tracking-widest text-[#c0261a] hover:text-[#8b1a10] disabled:opacity-40 transition-colors cursor-pointer">
                                            {deleting() === tag.id ? "..." : "DELETE"}
                                        </button>
                                    </div>
                                )}
                            </For>
                        </div>
                    </Show>
                </Show>
            </main>
        </div>
    );
}
