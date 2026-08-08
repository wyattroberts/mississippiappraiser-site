"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Status = "draft" | "published" | "archived";

type StoredPost = {
  id: number;
  date: string;
  modified: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  categories: string[];
  tags?: string[];
  featuredImage: string | null;
  featuredImageAlt?: string;
  seoTitle?: string;
  seoDescription?: string;
  status?: Status;
  originalUrl: string;
};

type Draft = {
  id?: number;
  title: string;
  slug: string;
  date: string;
  excerpt: string;
  content: string;
  categories: string;
  tags: string;
  featuredImage: string;
  featuredImageAlt: string;
  seoTitle: string;
  seoDescription: string;
  status: Status;
};

function centralDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function slugify(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
}

function blankDraft(): Draft {
  return {
    title: "",
    slug: "",
    date: centralDate(),
    excerpt: "",
    content: "<p></p>",
    categories: "Appraisal practice",
    tags: "",
    featuredImage: "",
    featuredImageAlt: "",
    seoTitle: "",
    seoDescription: "",
    status: "draft",
  };
}

function toDraft(post: StoredPost): Draft {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    date: post.date.slice(0, 10),
    excerpt: post.excerpt.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    content: post.content.replace(/\[\/?et_pb_[^\]]*\]/g, "").replace(/image-(?:1024x912|980x873|480x428)\.png/g, "image.png"),
    categories: post.categories.join(", "),
    tags: (post.tags || []).join(", "),
    featuredImage: post.featuredImage || "",
    featuredImageAlt: post.featuredImageAlt || "",
    seoTitle: post.seoTitle || "",
    seoDescription: post.seoDescription || "",
    status: post.status || "published",
  };
}

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function BlogAdmin() {
  const [checking, setChecking] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [posts, setPosts] = useState<StoredPost[]>([]);
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [selectedId, setSelectedId] = useState<number | "new">("new");
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"edit" | "preview" | "html">("edit");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<{ kind: "success" | "error" | "info"; text: string; link?: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const featuredInputRef = useRef<HTMLInputElement>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((session) => {
        setConfigured(Boolean(session.configured));
        setAuthenticated(Boolean(session.authenticated));
        if (session.authenticated) void loadPosts();
      })
      .catch(() => setNotice({ kind: "error", text: "Unable to check the publishing session." }))
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (editorRef.current && view === "edit" && editorRef.current.innerHTML !== draft.content) {
      editorRef.current.innerHTML = draft.content;
    }
  }, [draft.content, selectedId, view]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function api(url: string, init?: RequestInit) {
    const response = await fetch(url, { ...init, cache: "no-store" });
    const body = await response.text();
    let payload: any = {};
    try {
      payload = JSON.parse(body);
    } catch {
      // Gateways sometimes return an HTML error page instead of JSON.
    }
    if (!response.ok) {
      const fallback = response.status === 504
        ? "The publishing server timed out. Please try again."
        : `Request failed (${response.status})`;
      throw new Error(payload.error || fallback);
    }
    return payload;
  }

  async function loadPosts() {
    setBusy("Loading posts…");
    try {
      const payload = await api("/api/admin/posts");
      setPosts(payload.posts);
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Unable to load posts." });
    } finally {
      setBusy("");
    }
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy("Signing in…");
    setNotice(null);
    try {
      await api("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      setAuthenticated(true);
      setPassword("");
      await loadPosts();
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Unable to sign in." });
    } finally {
      setBusy("");
    }
  }

  async function logout() {
    await api("/api/admin/logout", { method: "POST" }).catch(() => null);
    setAuthenticated(false);
    setPosts([]);
    setDraft(blankDraft());
    setSelectedId("new");
  }

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  function updateTitle(value: string) {
    setDraft((current) => ({ ...current, title: value, slug: !current.id && (!current.slug || current.slug === slugify(current.title)) ? slugify(value) : current.slug }));
    setDirty(true);
  }

  function choosePost(post: StoredPost) {
    if (dirty && !window.confirm("Discard your unsaved changes?")) return;
    setSelectedId(post.id);
    setDraft(toDraft(post));
    setDirty(false);
    setNotice(null);
    setView("edit");
  }

  function newPost() {
    if (dirty && !window.confirm("Discard your unsaved changes?")) return;
    setSelectedId("new");
    setDraft(blankDraft());
    setDirty(false);
    setNotice(null);
    setView("edit");
  }

  function syncEditor() {
    if (editorRef.current) update("content", editorRef.current.innerHTML);
  }

  function format(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncEditor();
  }

  function addLink() {
    const href = window.prompt("Paste the link URL:", "https://");
    if (href) format("createLink", href);
  }

  async function upload(file: File, purpose: "featured" | "inline") {
    setBusy("Uploading image…");
    setNotice(null);
    const localPreview = URL.createObjectURL(file);
    if (purpose === "featured") setDraft((current) => ({ ...current, featuredImage: localPreview }));
    try {
      const form = new FormData();
      form.append("image", file);
      form.append("label", draft.slug || draft.title || file.name);
      const payload = await api("/api/admin/upload", { method: "POST", body: form });
      if (purpose === "featured") {
        update("featuredImage", payload.path);
      } else {
        update("content", `${draft.content}<figure><img src="${payload.path}" alt=""><figcaption></figcaption></figure><p></p>`);
      }
      const dimensions = payload.width && payload.height ? ` (${payload.width} × ${payload.height})` : "";
      setNotice({ kind: "success", text: `Image uploaded and optimized${dimensions}.` });
    } catch (error) {
      if (purpose === "featured") setDraft((current) => ({ ...current, featuredImage: "" }));
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Unable to upload image." });
    } finally {
      URL.revokeObjectURL(localPreview);
      setBusy("");
    }
  }

  async function save(status: "draft" | "published") {
    const content = view === "edit" && editorRef.current ? editorRef.current.innerHTML : draft.content;
    setBusy(status === "published" ? "Publishing…" : "Saving draft…");
    setNotice(null);
    try {
      const payload = await api("/api/admin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          content,
          status,
          categories: splitList(draft.categories),
          tags: splitList(draft.tags),
        }),
      });
      setPosts(payload.posts);
      setDraft(toDraft(payload.post));
      setSelectedId(payload.post.id);
      setDirty(false);
      setNotice({
        kind: payload.backupWarning ? "info" : "success",
        text: payload.backupWarning || (status === "published" ? "Published. The article is live now." : "Draft saved privately."),
      });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Unable to save the post." });
    } finally {
      setBusy("");
    }
  }

  async function archive() {
    if (!draft.id || !window.confirm(`Archive “${draft.title}”? It will disappear from the public blog but remain recoverable.`)) return;
    setBusy("Archiving…");
    try {
      const payload = await api("/api/admin/posts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: draft.id }) });
      setPosts(payload.posts);
      setDraft(toDraft(payload.post));
      setDirty(false);
      setNotice({ kind: payload.backupWarning ? "info" : "success", text: payload.backupWarning || "Post archived. It has been removed from the public blog." });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Unable to archive the post." });
    } finally {
      setBusy("");
    }
  }

  const visiblePosts = useMemo(() => posts.filter((post) => {
    const status = post.status || "published";
    const matchesFilter = filter === "all" || status === filter;
    const haystack = `${post.title} ${post.categories.join(" ")} ${(post.tags || []).join(" ")}`.toLowerCase();
    return matchesFilter && haystack.includes(search.toLowerCase());
  }), [filter, posts, search]);

  if (checking) return <main className="publisher-entry"><p>Opening the publisher…</p></main>;

  if (!configured) {
    return (
      <main className="publisher-entry">
        <div className="publisher-login-card">
          <p className="eyebrow">Mississippi Appraiser</p>
          <h1>Publisher setup required</h1>
          <p>The editor is installed. Add its protected database and publishing settings in DigitalOcean to activate it.</p>
          <code>BLOG_ADMIN_PASSWORD · BLOG_SESSION_SECRET · DATABASE_URL</code>
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="publisher-entry">
        <form className="publisher-login-card" onSubmit={login}>
          <p className="eyebrow">Mississippi Appraiser</p>
          <h1>Blog publisher</h1>
          <p>Sign in to write, preview, and publish articles.</p>
          <label><span>Publisher password</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus /></label>
          <button className="button button-primary" disabled={!password || Boolean(busy)}>{busy || "Sign in"}</button>
          {notice && <p className={`publisher-notice ${notice.kind}`}>{notice.text}</p>}
        </form>
      </main>
    );
  }

  return (
    <main className="publisher-app">
      <header className="publisher-bar">
        <div><span className="publisher-mark">MA</span><div><strong>Blog Publisher</strong><small>Mississippi Appraiser</small></div></div>
        <div className="publisher-bar-actions">
          {busy && <span className="publisher-busy">{busy}</span>}
          <a href="/blog/" target="_blank" rel="noreferrer">View blog ↗</a>
          <button type="button" onClick={logout}>Sign out</button>
        </div>
      </header>

      <div className="publisher-workspace">
        <aside className="publisher-sidebar">
          <button className="publisher-new" type="button" onClick={newPost}>＋ New article</button>
          <input className="publisher-search" type="search" placeholder="Search posts…" value={search} onChange={(event) => setSearch(event.target.value)} />
          <div className="publisher-filters" role="group" aria-label="Filter posts">
            {(["all", "published", "draft", "archived"] as const).map((value) => <button className={filter === value ? "active" : ""} type="button" key={value} onClick={() => setFilter(value)}>{value}</button>)}
          </div>
          <div className="publisher-post-list">
            {visiblePosts.map((post) => (
              <button className={selectedId === post.id ? "active" : ""} type="button" key={post.id} onClick={() => choosePost(post)}>
                <span className={`publisher-status ${post.status || "published"}`}>{post.status || "published"}</span>
                <strong>{post.title}</strong>
                <small>{new Date(post.modified || post.date).toLocaleDateString()}</small>
              </button>
            ))}
            {!visiblePosts.length && <p className="publisher-empty">No matching posts.</p>}
          </div>
        </aside>

        <section className="publisher-editor">
          <div className="publisher-editor-head">
            <div>
              <p className="eyebrow">{draft.id ? "Edit article" : "New article"}</p>
              <h1>{draft.title || "Untitled article"}</h1>
            </div>
            <div className="publisher-actions">
              {draft.id && draft.status !== "archived" && <button className="publisher-danger" type="button" onClick={archive}>Archive</button>}
              <button type="button" onClick={() => save("draft")} disabled={Boolean(busy)}>Save draft</button>
              <button className="publisher-publish" type="button" onClick={() => save("published")} disabled={Boolean(busy)}>Publish</button>
            </div>
          </div>

          {notice && <div className={`publisher-notice ${notice.kind}`}>{notice.text}{notice.link && <a href={notice.link} target="_blank" rel="noreferrer">View revision ↗</a>}</div>}

          <div className="publisher-tabs" role="tablist">
            <button className={view === "edit" ? "active" : ""} type="button" onClick={() => setView("edit")}>Write</button>
            <button className={view === "preview" ? "active" : ""} type="button" onClick={() => setView("preview")}>Preview</button>
            <button className={view === "html" ? "active" : ""} type="button" onClick={() => setView("html")}>HTML</button>
          </div>

          <div className="publisher-fields">
            <label className="publisher-field full"><span>Title</span><input value={draft.title} onChange={(event) => updateTitle(event.target.value)} placeholder="A clear, specific article title" /></label>
            <label className="publisher-field"><span>Publication date</span><input type="date" value={draft.date} onChange={(event) => update("date", event.target.value)} /></label>
            <label className="publisher-field"><span>URL slug</span><input value={draft.slug} onChange={(event) => update("slug", slugify(event.target.value))} placeholder="article-url" /></label>
            <label className="publisher-field full"><span>Excerpt</span><textarea value={draft.excerpt} onChange={(event) => update("excerpt", event.target.value)} placeholder="Two or three sentences used on the blog page and in search previews." /></label>
          </div>

          {view === "edit" && (
            <div className="publisher-body-editor">
              <div className="publisher-toolbar" role="toolbar" aria-label="Article formatting">
                <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => format("formatBlock", "p")}>Paragraph</button>
                <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => format("formatBlock", "h2")}>Heading 2</button>
                <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => format("formatBlock", "h3")}>Heading 3</button>
                <button type="button" title="Bold" onMouseDown={(event) => event.preventDefault()} onClick={() => format("bold")}><b>B</b></button>
                <button type="button" title="Italic" onMouseDown={(event) => event.preventDefault()} onClick={() => format("italic")}><i>I</i></button>
                <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => format("insertUnorderedList")}>• List</button>
                <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => format("insertOrderedList")}>1. List</button>
                <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => format("formatBlock", "blockquote")}>Quote</button>
                <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={addLink}>Link</button>
                <button type="button" onClick={() => inlineInputRef.current?.click()}>Image</button>
                <input ref={inlineInputRef} hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file, "inline"); event.target.value = ""; }} />
              </div>
              <div ref={editorRef} className="publisher-content-editor article-body" contentEditable suppressContentEditableWarning onInput={syncEditor} data-placeholder="Start writing your article…" />
            </div>
          )}

          {view === "html" && <textarea className="publisher-html" value={draft.content} onChange={(event) => update("content", event.target.value)} spellCheck={false} />}

          {view === "preview" && (
            <article className="publisher-preview">
              <header className="article-header"><p className="post-date">{draft.date} · Wyatt Roberts</p><h1>{draft.title || "Untitled article"}</h1></header>
              {draft.featuredImage && <div className="article-image"><img src={draft.featuredImage} alt={draft.featuredImageAlt} /></div>}
              <div className="article-body" dangerouslySetInnerHTML={{ __html: draft.content }} />
            </article>
          )}

          <section className="publisher-settings">
            <h2>Publishing details</h2>
            <div className="publisher-fields">
              <label className="publisher-field"><span>Categories</span><input value={draft.categories} onChange={(event) => update("categories", event.target.value)} placeholder="Appraisal practice, Technology" /><small>Separate with commas.</small></label>
              <label className="publisher-field"><span>Tags</span><input value={draft.tags} onChange={(event) => update("tags", event.target.value)} placeholder="commercial appraisal, Mississippi" /><small>Separate with commas.</small></label>
              <div className="publisher-image-field full">
                <div>
                  <span>Featured image</span>
                  <p>JPG, PNG, WebP, or GIF; maximum 15 MB. Still images are resized and compressed automatically.</p>
                  <button type="button" onClick={() => featuredInputRef.current?.click()}>Choose image</button>
                  <input ref={featuredInputRef} hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file, "featured"); event.target.value = ""; }} />
                </div>
                {draft.featuredImage ? <img src={draft.featuredImage} alt="Featured image preview" /> : <div className="publisher-image-placeholder">No image</div>}
              </div>
              <label className="publisher-field full"><span>Featured-image alt text</span><input value={draft.featuredImageAlt} onChange={(event) => update("featuredImageAlt", event.target.value)} placeholder="Describe what is visible in the image." /></label>
            </div>
          </section>

          <section className="publisher-settings">
            <h2>Search appearance</h2>
            <div className="publisher-fields">
              <label className="publisher-field full"><span>SEO title</span><input value={draft.seoTitle} onChange={(event) => update("seoTitle", event.target.value)} placeholder={draft.title || "Search-result title"} /><small>{draft.seoTitle.length}/70 characters</small></label>
              <label className="publisher-field full"><span>SEO description</span><textarea value={draft.seoDescription} onChange={(event) => update("seoDescription", event.target.value)} placeholder={draft.excerpt || "Describe the article for search results."} /><small>{draft.seoDescription.length}/170 characters</small></label>
              <div className="publisher-serp full"><span>mississippiappraiser.com › {draft.slug || "article-url"}</span><strong>{draft.seoTitle || draft.title || "Article title"}</strong><p>{draft.seoDescription || draft.excerpt || "Your search description will appear here."}</p></div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
