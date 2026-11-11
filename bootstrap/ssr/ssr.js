import { Head, Link, createInertiaApp, router, useForm, usePage } from "@inertiajs/react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import axios from "axios";
import createServer from "@inertiajs/react/server";
import ReactDOMServer from "react-dom/server";
//#region \0rolldown/runtime.js
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
//#endregion
//#region resources/js/Layouts/AdminLayout.jsx
var NAVIGATION = [
	{
		group: "Overview",
		items: [{
			href: "/admin",
			label: "Dashboard",
			icon: "bi-grid-1x2",
			exact: true
		}]
	},
	{
		group: "Manage",
		items: [{
			href: "/admin/users",
			label: "Users",
			icon: "bi-people"
		}, {
			href: "/admin/resumes",
			label: "Tailored resumes",
			icon: "bi-file-earmark-text"
		}]
	},
	{
		group: "Content",
		items: [{
			href: "/admin/posts",
			label: "Blog posts",
			icon: "bi-journal-text"
		}, {
			href: "/admin/messages",
			label: "Messages",
			icon: "bi-inbox"
		}]
	},
	{
		group: "System",
		items: [
			{
				href: "/admin/ai-keys",
				label: "AI keys",
				icon: "bi-key"
			},
			{
				href: "/admin/jobs",
				label: "Job feeds",
				icon: "bi-broadcast"
			},
			{
				href: "/admin/adsense",
				label: "AdSense",
				icon: "bi-badge-ad"
			},
			{
				href: "/admin/settings",
				label: "Settings",
				icon: "bi-gear"
			}
		]
	}
];
var initials$1 = (name = "") => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("") || "A";
/**
* The admin shell: a dark sidebar with grouped sections and the signed-in admin, a top bar with the
* page title and actions, and toast messages for actions that redirect back with a status.
*/
function AdminLayout({ title, subtitle, actions = null, children, seo }) {
	const { url, props } = usePage();
	const path = url.split("?")[0];
	const user = props.auth?.user;
	const errors = props.errors ?? {};
	const status = props.flash?.status;
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const [toast, setToast] = useState(status);
	useEffect(() => {
		setToast(status);
		if (!status) return;
		const timeout = setTimeout(() => setToast(null), 4e3);
		return () => clearTimeout(timeout);
	}, [status, url]);
	useEffect(() => setIsSidebarOpen(false), [url]);
	const isActive = (item) => item.exact ? path === item.href : path === item.href || path.startsWith(`${item.href}/`);
	const pageTitle = seo?.title ?? title;
	return /* @__PURE__ */ jsxs("div", {
		className: "rt-admin",
		children: [
			/* @__PURE__ */ jsxs(Head, { children: [/* @__PURE__ */ jsx("title", { children: `${pageTitle} · Admin` }), /* @__PURE__ */ jsx("meta", {
				name: "robots",
				content: "noindex, nofollow"
			})] }),
			/* @__PURE__ */ jsxs("aside", {
				className: `rt-admin-sidebar ${isSidebarOpen ? "is-open" : ""}`,
				"aria-label": "Admin navigation",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "rt-admin-brand",
						children: [/* @__PURE__ */ jsx("span", {
							className: "rt-brand-mark",
							children: /* @__PURE__ */ jsx("i", { className: "bi bi-file-earmark-check" })
						}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
							className: "fw-bold",
							children: "ResumeTailor"
						}), /* @__PURE__ */ jsx("div", {
							className: "rt-admin-brand-sub",
							children: "Admin console"
						})] })]
					}),
					/* @__PURE__ */ jsx("nav", {
						className: "rt-admin-menu",
						children: NAVIGATION.map((section) => /* @__PURE__ */ jsxs("div", {
							className: "mb-3",
							children: [/* @__PURE__ */ jsx("div", {
								className: "rt-admin-group",
								children: section.group
							}), section.items.map((item) => /* @__PURE__ */ jsxs(Link, {
								href: item.href,
								className: `rt-admin-item ${isActive(item) ? "is-active" : ""}`,
								children: [/* @__PURE__ */ jsx("i", { className: `bi ${item.icon}` }), /* @__PURE__ */ jsx("span", { children: item.label })]
							}, item.href))]
						}, section.group))
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "rt-admin-account",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "d-flex align-items-center gap-2 mb-3",
							children: [/* @__PURE__ */ jsx("span", {
								className: "rt-admin-avatar",
								children: initials$1(user?.name)
							}), /* @__PURE__ */ jsxs("div", {
								className: "min-w-0",
								children: [/* @__PURE__ */ jsx("div", {
									className: "fw-semibold text-truncate",
									children: user?.name
								}), /* @__PURE__ */ jsx("div", {
									className: "rt-admin-brand-sub",
									children: user?.is_super_admin ? "Super admin" : "Admin"
								})]
							})]
						}), /* @__PURE__ */ jsxs("div", {
							className: "d-grid gap-1",
							children: [
								/* @__PURE__ */ jsxs(Link, {
									href: "/",
									className: "rt-admin-item",
									children: [/* @__PURE__ */ jsx("i", { className: "bi bi-box-arrow-up-right" }), /* @__PURE__ */ jsx("span", { children: "View site" })]
								}),
								/* @__PURE__ */ jsxs(Link, {
									href: "/profile",
									className: "rt-admin-item",
									children: [/* @__PURE__ */ jsx("i", { className: "bi bi-person" }), /* @__PURE__ */ jsx("span", { children: "My profile" })]
								}),
								/* @__PURE__ */ jsxs(Link, {
									href: "/logout",
									method: "post",
									as: "button",
									className: "rt-admin-item w-100 border-0 bg-transparent text-start",
									children: [/* @__PURE__ */ jsx("i", { className: "bi bi-box-arrow-right" }), /* @__PURE__ */ jsx("span", { children: "Log out" })]
								})
							]
						})]
					})
				]
			}),
			isSidebarOpen && /* @__PURE__ */ jsx("button", {
				type: "button",
				className: "rt-admin-backdrop",
				"aria-label": "Close menu",
				onClick: () => setIsSidebarOpen(false)
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "rt-admin-main",
				children: [/* @__PURE__ */ jsxs("header", {
					className: "rt-admin-topbar",
					children: [
						/* @__PURE__ */ jsx("button", {
							type: "button",
							className: "btn btn-sm btn-light border d-lg-none",
							"aria-label": "Open menu",
							onClick: () => setIsSidebarOpen(true),
							children: /* @__PURE__ */ jsx("i", { className: "bi bi-list" })
						}),
						/* @__PURE__ */ jsx("span", {
							className: "fw-semibold d-sm-none",
							children: title
						}),
						/* @__PURE__ */ jsxs("nav", {
							"aria-label": "Breadcrumb",
							className: "small text-muted d-none d-sm-block",
							children: [
								/* @__PURE__ */ jsx(Link, {
									href: "/admin",
									className: "text-decoration-none text-muted",
									children: "Admin"
								}),
								/* @__PURE__ */ jsx("i", { className: "bi bi-chevron-right mx-2 small" }),
								/* @__PURE__ */ jsx("span", {
									className: "text-body fw-semibold",
									children: title
								})
							]
						}),
						/* @__PURE__ */ jsx("div", {
							className: "ms-auto d-flex align-items-center gap-2",
							children: /* @__PURE__ */ jsxs("span", {
								className: "badge rounded-pill text-bg-light border d-none d-md-inline-flex align-items-center gap-1",
								children: [/* @__PURE__ */ jsx("span", { className: "rt-admin-dot" }), "Live"]
							})
						})
					]
				}), /* @__PURE__ */ jsxs("main", {
					className: "rt-admin-content",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "rt-admin-header",
							children: [/* @__PURE__ */ jsxs("div", {
								className: "min-w-0",
								children: [/* @__PURE__ */ jsx("h1", {
									className: "rt-admin-title",
									children: title
								}), subtitle && /* @__PURE__ */ jsx("p", {
									className: "rt-admin-subtitle",
									children: subtitle
								})]
							}), actions && /* @__PURE__ */ jsx("div", {
								className: "d-flex flex-wrap gap-2",
								children: actions
							})]
						}),
						errors.user && /* @__PURE__ */ jsxs("div", {
							className: "alert alert-danger d-flex gap-2 align-items-start",
							role: "alert",
							children: [/* @__PURE__ */ jsx("i", { className: "bi bi-exclamation-octagon mt-1" }), /* @__PURE__ */ jsx("span", { children: errors.user })]
						}),
						children
					]
				})]
			}),
			toast && /* @__PURE__ */ jsxs("div", {
				className: "rt-admin-toast",
				role: "status",
				children: [
					/* @__PURE__ */ jsx("i", { className: "bi bi-check-circle-fill" }),
					/* @__PURE__ */ jsx("span", { children: toast }),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "btn-close btn-close-white ms-2",
						"aria-label": "Dismiss",
						onClick: () => setToast(null)
					})
				]
			})
		]
	});
}
//#endregion
//#region resources/js/Pages/Admin/AdSense.jsx
var AdSense_exports = /* @__PURE__ */ __exportAll({ default: () => AdSense });
var CHECKLIST = [
	["Deploy the site on your own domain with HTTPS", "AdSense cannot review localhost."],
	["Publish 15–30 original guides in Blog posts", "Thin or tool-only sites are the most common rejection."],
	["Privacy, Terms, About and Contact pages", "Done: linked in the footer."],
	["Add your publisher ID below and save", "Adds the verification meta tag and /ads.txt."],
	["In AdSense, add the site and request review", "Choose the \"meta tag\" or \"ads.txt\" verification."],
	["Turn on Google's consent message (Privacy & messaging)", "Required for visitors from the EEA, UK and Switzerland."],
	["After approval, create two display ad units and paste their IDs below", "Then switch ads on."]
];
function AdSense({ settings, adsTxt, adsTxtUrl, sitemapUrl, canManage, seo }) {
	const form = useForm({ ...settings });
	const submit = (event) => {
		event.preventDefault();
		form.put("/admin/adsense", { preserveScroll: true });
	};
	const field = (name, label, placeholder, help) => /* @__PURE__ */ jsxs("div", {
		className: "mb-3",
		children: [
			/* @__PURE__ */ jsx("label", {
				htmlFor: name,
				className: "form-label fw-semibold small",
				children: label
			}),
			/* @__PURE__ */ jsx("input", {
				id: name,
				className: `form-control rt-key-mono ${form.errors[name] ? "is-invalid" : ""}`,
				placeholder,
				value: form.data[name],
				onChange: (event) => form.setData(name, event.target.value),
				disabled: !canManage
			}),
			form.errors[name] ? /* @__PURE__ */ jsx("div", {
				className: "invalid-feedback",
				children: form.errors[name]
			}) : /* @__PURE__ */ jsx("div", {
				className: "form-text",
				children: help
			})
		]
	});
	return /* @__PURE__ */ jsx(AdminLayout, {
		title: "AdSense",
		subtitle: "Google AdSense settings. Ads only show on blog pages, and never to Pro members.",
		seo,
		children: /* @__PURE__ */ jsxs("div", {
			className: "row g-4",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "col-xl-7",
				children: [/* @__PURE__ */ jsxs("form", {
					className: "rt-card p-3 p-lg-4 mb-4",
					onSubmit: submit,
					noValidate: true,
					children: [
						/* @__PURE__ */ jsxs("h2", {
							className: "rt-card-title mb-3",
							children: [/* @__PURE__ */ jsx("i", { className: "bi bi-badge-ad" }), "Settings"]
						}),
						field("client", "Publisher ID", "ca-pub-1234567890123456", "From AdSense → Account → Account information. Starts with ca-pub-."),
						/* @__PURE__ */ jsxs("div", {
							className: "row",
							children: [/* @__PURE__ */ jsx("div", {
								className: "col-md-6",
								children: field("slot_in_article", "In-article ad unit ID", "1234567890", "Shown after each blog article.")
							}), /* @__PURE__ */ jsx("div", {
								className: "col-md-6",
								children: field("slot_in_feed", "Blog list ad unit ID", "1234567890", "Shown between guides on the blog page.")
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "form-check form-switch mb-3",
							children: [
								/* @__PURE__ */ jsx("input", {
									id: "enabled",
									type: "checkbox",
									role: "switch",
									className: "form-check-input",
									checked: form.data.enabled,
									onChange: (event) => form.setData("enabled", event.target.checked),
									disabled: !canManage
								}),
								/* @__PURE__ */ jsx("label", {
									htmlFor: "enabled",
									className: "form-check-label fw-semibold",
									children: "Show ads"
								}),
								/* @__PURE__ */ jsx("div", {
									className: "form-text",
									children: "Keep this off until AdSense approves the site. The verification tag and ads.txt work either way."
								})
							]
						}),
						canManage ? /* @__PURE__ */ jsx("button", {
							type: "submit",
							className: "btn rt-btn-primary px-4 py-2",
							disabled: form.processing || !form.isDirty,
							children: form.processing ? "Saving..." : "Save settings"
						}) : /* @__PURE__ */ jsxs("div", {
							className: "alert alert-light border small mb-0",
							children: [/* @__PURE__ */ jsx("i", { className: "bi bi-lock me-1" }), "Only super admins can change AdSense settings."]
						})
					]
				}), /* @__PURE__ */ jsxs("section", {
					className: "rt-card p-3 p-lg-4",
					children: [/* @__PURE__ */ jsxs("h2", {
						className: "rt-card-title mb-3",
						children: [/* @__PURE__ */ jsx("i", { className: "bi bi-file-earmark-code" }), "Files for Google"]
					}), /* @__PURE__ */ jsxs("dl", {
						className: "row small mb-0",
						children: [
							/* @__PURE__ */ jsx("dt", {
								className: "col-sm-3 text-muted fw-normal",
								children: "ads.txt"
							}),
							/* @__PURE__ */ jsx("dd", {
								className: "col-sm-9",
								children: adsTxt ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("a", {
									href: adsTxtUrl,
									target: "_blank",
									rel: "noreferrer",
									children: adsTxtUrl
								}), /* @__PURE__ */ jsx("code", {
									className: "d-block mt-1",
									children: adsTxt
								})] }) : /* @__PURE__ */ jsx("span", {
									className: "text-muted",
									children: "Appears once a publisher ID is saved."
								})
							}),
							/* @__PURE__ */ jsx("dt", {
								className: "col-sm-3 text-muted fw-normal",
								children: "Sitemap"
							}),
							/* @__PURE__ */ jsxs("dd", {
								className: "col-sm-9",
								children: [/* @__PURE__ */ jsx("a", {
									href: sitemapUrl,
									target: "_blank",
									rel: "noreferrer",
									children: sitemapUrl
								}), /* @__PURE__ */ jsx("div", {
									className: "text-muted",
									children: "Submit it in Google Search Console."
								})]
							})
						]
					})]
				})]
			}), /* @__PURE__ */ jsx("div", {
				className: "col-xl-5",
				children: /* @__PURE__ */ jsxs("section", {
					className: "rt-card p-3 p-lg-4",
					children: [/* @__PURE__ */ jsxs("h2", {
						className: "rt-card-title mb-3",
						children: [/* @__PURE__ */ jsx("i", { className: "bi bi-list-check" }), "Approval checklist"]
					}), /* @__PURE__ */ jsx("ol", {
						className: "ps-3 mb-0 d-grid gap-2 small",
						children: CHECKLIST.map(([step, note]) => /* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx("div", {
							className: "fw-semibold",
							children: step
						}), /* @__PURE__ */ jsx("div", {
							className: "text-muted",
							children: note
						})] }, step))
					})]
				})
			})]
		})
	});
}
//#endregion
//#region resources/js/Components/AdminUi.jsx
var formatNumber = (value) => Number(value || 0).toLocaleString();
var formatDate$6 = (value, withTime = false) => {
	if (!value) return "—";
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString(void 0, withTime ? {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit"
	} : {
		day: "numeric",
		month: "short",
		year: "numeric"
	});
};
function StatCard({ label, value, hint, icon, tone = "indigo" }) {
	return /* @__PURE__ */ jsx("div", {
		className: "rt-card p-3 h-100",
		children: /* @__PURE__ */ jsxs("div", {
			className: "rt-stat",
			children: [icon && /* @__PURE__ */ jsx("span", {
				className: `rt-stat-icon rt-tone-${tone}`,
				children: /* @__PURE__ */ jsx("i", { className: `bi ${icon}` })
			}), /* @__PURE__ */ jsxs("div", {
				className: "min-w-0",
				children: [
					/* @__PURE__ */ jsx("div", {
						className: "rt-stat-label",
						children: label
					}),
					/* @__PURE__ */ jsx("div", {
						className: "rt-stat-value",
						children: value
					}),
					hint && /* @__PURE__ */ jsx("div", {
						className: "rt-stat-hint",
						children: hint
					})
				]
			})]
		})
	});
}
function PlanBadge({ plan, complimentary = false }) {
	return plan === "pro" ? /* @__PURE__ */ jsxs("span", {
		className: "rt-plan-pill",
		children: [
			/* @__PURE__ */ jsx("i", { className: "bi bi-stars" }),
			"Pro",
			complimentary ? " (gift)" : ""
		]
	}) : /* @__PURE__ */ jsx("span", {
		className: "badge text-bg-light border",
		children: "Free"
	});
}
function ScoreChange({ before, after }) {
	if (after === null || after === void 0) return /* @__PURE__ */ jsx("span", {
		className: "text-muted",
		children: "—"
	});
	const gain = before !== null && before !== void 0 ? after - before : null;
	return /* @__PURE__ */ jsxs("span", {
		className: "text-nowrap",
		children: [
			/* @__PURE__ */ jsx("span", {
				className: "text-muted",
				children: before ?? "—"
			}),
			/* @__PURE__ */ jsx("i", { className: "bi bi-arrow-right mx-1 text-muted small" }),
			/* @__PURE__ */ jsx("strong", { children: after }),
			gain !== null && gain > 0 && /* @__PURE__ */ jsxs("span", {
				className: "text-success small ms-1",
				children: ["+", gain]
			})
		]
	});
}
/**
* Laravel paginator links ("« Previous", "1", "2", "Next »") as Inertia links.
*/
function Pagination({ paginator }) {
	if (!paginator || paginator.last_page <= 1) return null;
	return /* @__PURE__ */ jsxs("nav", {
		className: "d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3",
		"aria-label": "Pages",
		children: [/* @__PURE__ */ jsxs("small", {
			className: "text-muted",
			children: [
				"Showing ",
				paginator.from,
				"–",
				paginator.to,
				" of ",
				formatNumber(paginator.total)
			]
		}), /* @__PURE__ */ jsx("ul", {
			className: "pagination pagination-sm mb-0 flex-wrap",
			children: paginator.links.map((link, index) => /* @__PURE__ */ jsx("li", {
				className: `page-item ${link.active ? "active" : ""} ${link.url ? "" : "disabled"}`,
				children: link.url ? /* @__PURE__ */ jsx(Link, {
					href: link.url,
					className: "page-link",
					preserveScroll: true,
					dangerouslySetInnerHTML: { __html: link.label }
				}) : /* @__PURE__ */ jsx("span", {
					className: "page-link",
					dangerouslySetInnerHTML: { __html: link.label }
				})
			}, index))
		})]
	});
}
//#endregion
//#region resources/js/Pages/Admin/AiKeys.jsx
var AiKeys_exports = /* @__PURE__ */ __exportAll({ default: () => AiKeys });
var formatWait = (seconds) => seconds >= 120 ? `${Math.ceil(seconds / 60)} min` : `${seconds} s`;
function AddKeyForm() {
	const form = useForm({
		name: "",
		key: ""
	});
	const [isVisible, setIsVisible] = useState(false);
	const submit = (event) => {
		event.preventDefault();
		form.post("/admin/ai-keys", {
			preserveScroll: true,
			onSuccess: () => form.reset()
		});
	};
	return /* @__PURE__ */ jsxs("form", {
		onSubmit: submit,
		noValidate: true,
		className: "rt-card p-3 p-lg-4 mb-4",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "d-flex align-items-center gap-2 mb-1",
				children: [/* @__PURE__ */ jsx("span", {
					className: "rt-stat-icon rt-tone-indigo",
					style: {
						width: "2.1rem",
						height: "2.1rem",
						fontSize: "1rem"
					},
					children: /* @__PURE__ */ jsx("i", { className: "bi bi-plus-lg" })
				}), /* @__PURE__ */ jsx("h2", {
					className: "rt-card-title",
					children: "Add a Groq API key"
				})]
			}),
			/* @__PURE__ */ jsxs("p", {
				className: "text-muted small mb-3",
				children: [
					"The key is checked with Groq before it is saved, stored encrypted, and joins the rotation straight away. Create keys at ",
					/* @__PURE__ */ jsx("a", {
						href: "https://console.groq.com/keys",
						target: "_blank",
						rel: "noreferrer",
						children: "console.groq.com/keys"
					}),
					"."
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "row g-3 align-items-start",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "col-md-4",
						children: [
							/* @__PURE__ */ jsx("label", {
								htmlFor: "key-name",
								className: "form-label fw-semibold small",
								children: "Name"
							}),
							/* @__PURE__ */ jsx("input", {
								id: "key-name",
								className: `form-control ${form.errors.name ? "is-invalid" : ""}`,
								placeholder: "e.g. Team account 2",
								maxLength: 80,
								value: form.data.name,
								onChange: (event) => form.setData("name", event.target.value)
							}),
							form.errors.name && /* @__PURE__ */ jsx("div", {
								className: "invalid-feedback",
								children: form.errors.name
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "col-md-6",
						children: [/* @__PURE__ */ jsx("label", {
							htmlFor: "key-value",
							className: "form-label fw-semibold small",
							children: "API key"
						}), /* @__PURE__ */ jsxs("div", {
							className: "input-group has-validation",
							children: [
								/* @__PURE__ */ jsx("input", {
									id: "key-value",
									type: isVisible ? "text" : "password",
									autoComplete: "off",
									spellCheck: "false",
									className: `form-control rt-key-mono ${form.errors.key ? "is-invalid" : ""}`,
									placeholder: "gsk_...",
									value: form.data.key,
									onChange: (event) => form.setData("key", event.target.value)
								}),
								/* @__PURE__ */ jsx("button", {
									type: "button",
									className: "btn btn-outline-secondary",
									onClick: () => setIsVisible((visible) => !visible),
									"aria-label": isVisible ? "Hide key" : "Show key",
									children: /* @__PURE__ */ jsx("i", { className: `bi ${isVisible ? "bi-eye-slash" : "bi-eye"}` })
								}),
								form.errors.key && /* @__PURE__ */ jsx("div", {
									className: "invalid-feedback",
									children: form.errors.key
								})
							]
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "col-md-2",
						children: [/* @__PURE__ */ jsx("label", {
							className: "form-label small d-none d-md-block",
							children: "\xA0"
						}), /* @__PURE__ */ jsx("button", {
							type: "submit",
							className: "btn rt-btn-primary w-100 py-2",
							disabled: form.processing || !form.data.key.trim() || !form.data.name.trim(),
							children: form.processing ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("span", {
								className: "spinner-border spinner-border-sm me-2",
								"aria-hidden": "true"
							}), "Checking"] }) : "Add key"
						})]
					})
				]
			})
		]
	});
}
function KeyStatus({ row }) {
	if (!row.is_active) return /* @__PURE__ */ jsx("span", {
		className: "badge text-bg-secondary",
		children: "Disabled"
	});
	if (row.paused_seconds > 0) return /* @__PURE__ */ jsxs("span", {
		className: "badge text-bg-warning",
		children: ["Paused · ", formatWait(row.paused_seconds)]
	});
	return /* @__PURE__ */ jsx("span", {
		className: "badge text-bg-success",
		children: "In rotation"
	});
}
function AiKeys({ keys, today, model, budgets, canManage, seo }) {
	const active = keys.filter((row) => row.is_active);
	const paused = active.filter((row) => row.paused_seconds > 0).length;
	const send = (method, url, data = {}, question = null) => {
		if (question && !window.confirm(question)) return;
		router[method](url, data, { preserveScroll: true });
	};
	const rename = (row) => {
		const name = window.prompt("New name for this key", row.name ?? "");
		if (name && name.trim() && name.trim() !== row.name) send("patch", `/admin/ai-keys/${row.id}`, { name: name.trim() });
	};
	return /* @__PURE__ */ jsxs(AdminLayout, {
		title: "AI keys",
		subtitle: "Groq keys rotate automatically. A rate-limited or rejected key is paused and requests move to the next one.",
		seo,
		actions: /* @__PURE__ */ jsxs("button", {
			type: "button",
			className: "btn btn-light border",
			onClick: () => router.reload({ only: ["keys", "today"] }),
			children: [/* @__PURE__ */ jsx("i", { className: "bi bi-arrow-clockwise me-1" }), "Refresh"]
		}),
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "row g-3 mb-4",
				children: [
					/* @__PURE__ */ jsx("div", {
						className: "col-sm-6 col-xl-3",
						children: /* @__PURE__ */ jsx(StatCard, {
							icon: "bi-key",
							tone: "indigo",
							label: "In rotation",
							value: `${active.length - paused} / ${keys.length}`,
							hint: paused > 0 ? `${paused} paused right now` : "No paused keys"
						})
					}),
					/* @__PURE__ */ jsx("div", {
						className: "col-sm-6 col-xl-3",
						children: /* @__PURE__ */ jsx(StatCard, {
							icon: "bi-arrow-repeat",
							tone: "sky",
							label: "Requests today",
							value: formatNumber(today.requests),
							hint: budgets.daily_request_limit > 0 ? `Limit ${formatNumber(budgets.daily_request_limit)} a day` : "No daily limit"
						})
					}),
					/* @__PURE__ */ jsx("div", {
						className: "col-sm-6 col-xl-3",
						children: /* @__PURE__ */ jsx(StatCard, {
							icon: "bi-lightning-charge",
							tone: "amber",
							label: "Tokens today",
							value: formatNumber(today.tokens),
							hint: budgets.daily_token_limit > 0 ? `Limit ${formatNumber(budgets.daily_token_limit)} a day` : "No daily limit"
						})
					}),
					/* @__PURE__ */ jsx("div", {
						className: "col-sm-6 col-xl-3",
						children: /* @__PURE__ */ jsx(StatCard, {
							icon: "bi-cpu",
							tone: "violet",
							label: "Model",
							value: /* @__PURE__ */ jsx("span", {
								className: "fs-6 text-break",
								children: model
							}),
							hint: `${formatNumber(today.failures)} failed requests today`
						})
					})
				]
			}),
			canManage ? /* @__PURE__ */ jsx(AddKeyForm, {}) : /* @__PURE__ */ jsxs("div", {
				className: "alert alert-light border small",
				children: [/* @__PURE__ */ jsx("i", { className: "bi bi-lock me-2" }), "Only super admins can add, disable or delete keys."]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "rt-card",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "d-flex justify-content-between align-items-center p-3 p-lg-4 pb-3",
					children: [/* @__PURE__ */ jsxs("h2", {
						className: "rt-card-title",
						children: [/* @__PURE__ */ jsx("i", { className: "bi bi-list-ul" }), "All keys"]
					}), /* @__PURE__ */ jsx("small", {
						className: "text-muted",
						children: "Only the last four characters are ever shown."
					})]
				}), /* @__PURE__ */ jsx("div", {
					className: "table-responsive",
					children: /* @__PURE__ */ jsxs("table", {
						className: "table rt-admin-table",
						children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
							/* @__PURE__ */ jsx("th", { children: "Key" }),
							/* @__PURE__ */ jsx("th", { children: "Source" }),
							/* @__PURE__ */ jsx("th", { children: "Status" }),
							/* @__PURE__ */ jsx("th", { children: "Added" }),
							/* @__PURE__ */ jsx("th", {
								className: "text-end",
								children: "Actions"
							})
						] }) }), /* @__PURE__ */ jsxs("tbody", { children: [keys.length === 0 && /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", {
							colSpan: "5",
							className: "text-center text-muted py-5",
							children: "No keys yet. Add one above, or set GROQ_API_KEYS in .env."
						}) }), keys.map((row) => /* @__PURE__ */ jsxs("tr", {
							className: row.is_active ? "" : "text-muted",
							children: [
								/* @__PURE__ */ jsxs("td", { children: [/* @__PURE__ */ jsx("div", {
									className: "fw-semibold",
									children: row.name || (row.source === "env" ? "From .env" : "Unnamed key")
								}), /* @__PURE__ */ jsx("div", {
									className: "rt-key-mono text-muted",
									children: row.label
								})] }),
								/* @__PURE__ */ jsx("td", { children: row.source === "env" ? /* @__PURE__ */ jsxs("span", {
									className: "badge text-bg-light border",
									children: [/* @__PURE__ */ jsx("i", { className: "bi bi-file-earmark-code me-1" }), ".env"]
								}) : /* @__PURE__ */ jsxs("span", {
									className: "badge text-bg-light border",
									children: [/* @__PURE__ */ jsx("i", { className: "bi bi-window me-1" }), "Panel"]
								}) }),
								/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(KeyStatus, { row }) }),
								/* @__PURE__ */ jsx("td", {
									className: "small text-muted",
									children: row.source === "env" ? "—" : /* @__PURE__ */ jsxs(Fragment, { children: [formatDate$6(row.created_at), row.added_by && /* @__PURE__ */ jsxs("div", { children: ["by ", row.added_by] })] })
								}),
								/* @__PURE__ */ jsxs("td", {
									className: "text-end text-nowrap",
									children: [
										row.is_active && row.paused_seconds > 0 && row.position && /* @__PURE__ */ jsx("button", {
											type: "button",
											className: "btn btn-sm btn-light border me-1",
											onClick: () => send("delete", `/admin/ai-keys/${row.position}/pause`),
											children: "Resume now"
										}),
										canManage && row.source === "panel" && /* @__PURE__ */ jsxs("div", {
											className: "btn-group btn-group-sm",
											children: [
												/* @__PURE__ */ jsx("button", {
													type: "button",
													className: "btn btn-light border",
													onClick: () => rename(row),
													title: "Rename",
													children: /* @__PURE__ */ jsx("i", { className: "bi bi-pencil" })
												}),
												/* @__PURE__ */ jsx("button", {
													type: "button",
													className: "btn btn-light border",
													onClick: () => send("patch", `/admin/ai-keys/${row.id}`, { is_active: !row.is_active }),
													title: row.is_active ? "Disable" : "Enable",
													children: /* @__PURE__ */ jsx("i", { className: `bi ${row.is_active ? "bi-pause-circle" : "bi-play-circle"}` })
												}),
												/* @__PURE__ */ jsx("button", {
													type: "button",
													className: "btn btn-light border text-danger",
													onClick: () => send("delete", `/admin/ai-keys/${row.id}`, {}, `Delete "${row.name}"? This cannot be undone.`),
													title: "Delete",
													children: /* @__PURE__ */ jsx("i", { className: "bi bi-trash" })
												})
											]
										}),
										row.source === "env" && /* @__PURE__ */ jsx("small", {
											className: "text-muted",
											children: "Edit in .env"
										})
									]
								})
							]
						}, row.id ? `panel-${row.id}` : `env-${row.position}`))] })]
					})
				})]
			})
		]
	});
}
//#endregion
//#region resources/js/Pages/Admin/Dashboard.jsx
var Dashboard_exports = /* @__PURE__ */ __exportAll({ default: () => Dashboard });
function Dashboard({ stats, ai, trend, recentUsers, recentResumes, seo }) {
	const peak = Math.max(1, ...trend.map((day) => day.count));
	return /* @__PURE__ */ jsxs(AdminLayout, {
		title: "Dashboard",
		subtitle: "Users, plans, tailoring activity and AI usage at a glance.",
		seo,
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "row g-3 mb-4",
				children: [
					/* @__PURE__ */ jsx("div", {
						className: "col-6 col-xl-3",
						children: /* @__PURE__ */ jsx(StatCard, {
							label: "Users",
							icon: "bi-people",
							tone: "indigo",
							value: formatNumber(stats.users),
							hint: `+${formatNumber(stats.new_users_7_days)} in the last 7 days`
						})
					}),
					/* @__PURE__ */ jsx("div", {
						className: "col-6 col-xl-3",
						children: /* @__PURE__ */ jsx(StatCard, {
							label: "Pro",
							icon: "bi-stars",
							tone: "violet",
							value: formatNumber(stats.pro_subscribers + stats.complimentary_pro),
							hint: `${formatNumber(stats.pro_subscribers)} paying · ${formatNumber(stats.complimentary_pro)} gifted`
						})
					}),
					/* @__PURE__ */ jsx("div", {
						className: "col-6 col-xl-3",
						children: /* @__PURE__ */ jsx(StatCard, {
							label: "Tailored this month",
							icon: "bi-file-earmark-check",
							tone: "green",
							value: formatNumber(stats.tailored_month),
							hint: `${formatNumber(stats.tailored_today)} today · ${formatNumber(stats.tailored_total)} all time`
						})
					}),
					/* @__PURE__ */ jsx("div", {
						className: "col-6 col-xl-3",
						children: /* @__PURE__ */ jsx(StatCard, {
							label: "Avg. score gain",
							icon: "bi-graph-up-arrow",
							tone: "sky",
							value: stats.average_improvement === null ? "—" : `+${stats.average_improvement}`,
							hint: "Points added by tailoring this month"
						})
					}),
					/* @__PURE__ */ jsx("div", {
						className: "col-6 col-xl-3",
						children: /* @__PURE__ */ jsx(StatCard, {
							label: "AI requests today",
							icon: "bi-cpu",
							tone: "amber",
							value: formatNumber(ai.today.requests),
							hint: `${formatNumber(ai.today.failures)} failed · ${formatNumber(ai.today.tokens)} tokens`
						})
					}),
					/* @__PURE__ */ jsx("div", {
						className: "col-6 col-xl-3",
						children: /* @__PURE__ */ jsx(StatCard, {
							label: "AI keys",
							icon: "bi-key",
							tone: "indigo",
							value: `${ai.keys - ai.paused_keys} / ${ai.keys}`,
							hint: ai.paused_keys > 0 ? `${ai.paused_keys} paused` : "All in rotation"
						})
					}),
					/* @__PURE__ */ jsx("div", {
						className: "col-6 col-xl-3",
						children: /* @__PURE__ */ jsx(StatCard, {
							label: "Suspended users",
							icon: "bi-slash-circle",
							tone: "rose",
							value: formatNumber(stats.suspended),
							hint: "Cannot sign in"
						})
					})
				]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "rt-card p-3 p-lg-4 mb-4",
				children: [/* @__PURE__ */ jsxs("h2", {
					className: "rt-card-title mb-3",
					children: [/* @__PURE__ */ jsx("i", { className: "bi bi-bar-chart" }), "Tailored resumes, last 14 days"]
				}), /* @__PURE__ */ jsx("div", {
					className: "rt-trend",
					role: "img",
					"aria-label": "Tailored resumes per day",
					children: trend.map((day) => /* @__PURE__ */ jsxs("div", {
						className: "rt-trend-bar",
						title: `${formatDate$6(day.date)}: ${day.count}`,
						children: [
							day.count > 0 && /* @__PURE__ */ jsx("small", { children: day.count }),
							/* @__PURE__ */ jsx("span", { style: { height: `${day.count / peak * 80}%` } }),
							/* @__PURE__ */ jsx("small", { children: (/* @__PURE__ */ new Date(`${day.date}T00:00:00`)).getDate() })
						]
					}, day.date))
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "row g-4",
				children: [/* @__PURE__ */ jsx("div", {
					className: "col-xl-5",
					children: /* @__PURE__ */ jsxs("section", {
						className: "rt-card h-100",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "d-flex justify-content-between align-items-center p-3 p-lg-4 pb-2",
							children: [/* @__PURE__ */ jsxs("h2", {
								className: "rt-card-title",
								children: [/* @__PURE__ */ jsx("i", { className: "bi bi-person-plus" }), "New users"]
							}), /* @__PURE__ */ jsx(Link, {
								href: "/admin/users",
								className: "small",
								children: "All users"
							})]
						}), /* @__PURE__ */ jsx("div", {
							className: "table-responsive",
							children: /* @__PURE__ */ jsx("table", {
								className: "table rt-admin-table",
								children: /* @__PURE__ */ jsx("tbody", { children: recentUsers.map((user) => /* @__PURE__ */ jsxs("tr", { children: [/* @__PURE__ */ jsxs("td", { children: [/* @__PURE__ */ jsx(Link, {
									href: `/admin/users/${user.id}`,
									className: "fw-semibold text-decoration-none",
									children: user.name
								}), /* @__PURE__ */ jsx("div", {
									className: "small text-muted",
									children: user.email
								})] }), /* @__PURE__ */ jsx("td", {
									className: "text-end small text-muted text-nowrap",
									children: formatDate$6(user.created_at)
								})] }, user.id)) })
							})
						})]
					})
				}), /* @__PURE__ */ jsx("div", {
					className: "col-xl-7",
					children: /* @__PURE__ */ jsxs("section", {
						className: "rt-card h-100",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "d-flex justify-content-between align-items-center p-3 p-lg-4 pb-2",
							children: [/* @__PURE__ */ jsxs("h2", {
								className: "rt-card-title",
								children: [/* @__PURE__ */ jsx("i", { className: "bi bi-file-earmark-text" }), "Latest tailored resumes"]
							}), /* @__PURE__ */ jsx(Link, {
								href: "/admin/resumes",
								className: "small",
								children: "All resumes"
							})]
						}), /* @__PURE__ */ jsx("div", {
							className: "table-responsive",
							children: /* @__PURE__ */ jsx("table", {
								className: "table rt-admin-table",
								children: /* @__PURE__ */ jsx("tbody", { children: recentResumes.map((resume) => /* @__PURE__ */ jsxs("tr", { children: [
									/* @__PURE__ */ jsxs("td", { children: [/* @__PURE__ */ jsx(Link, {
										href: `/tailor/${resume.id}`,
										className: "fw-semibold text-decoration-none",
										children: resume.job_title || `Resume #${resume.id}`
									}), /* @__PURE__ */ jsx("div", {
										className: "small text-muted",
										children: resume.user ? /* @__PURE__ */ jsx(Link, {
											href: `/admin/users/${resume.user.id}`,
											children: resume.user.name
										}) : "Guest"
									})] }),
									/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(ScoreChange, {
										before: resume.original_score,
										after: resume.match_score
									}) }),
									/* @__PURE__ */ jsx("td", {
										className: "text-end small text-muted text-nowrap",
										children: formatDate$6(resume.created_at, true)
									})
								] }, resume.id)) })
							})
						})]
					})
				})]
			})
		]
	});
}
//#endregion
//#region resources/js/Pages/Admin/JobMetrics.jsx
var JobMetrics_exports = /* @__PURE__ */ __exportAll({ default: () => JobMetrics });
var number = (value) => Number(value || 0).toLocaleString();
var formatDateTime$1 = (value) => {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date.toLocaleString(void 0, {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit"
	});
};
var providerTone = (provider) => {
	if (!provider.configured) return {
		label: "Not configured",
		className: "text-bg-light border"
	};
	if (provider.cooling_down_until && new Date(provider.cooling_down_until) > /* @__PURE__ */ new Date()) return {
		label: "Cooling down",
		className: "text-bg-danger"
	};
	if (provider.consecutive_failures > 0) return {
		label: "Degraded",
		className: "text-bg-warning"
	};
	if (provider.last_success_at) return {
		label: "Healthy",
		className: "text-bg-success"
	};
	return {
		label: "Never synced",
		className: "text-bg-secondary"
	};
};
function UsageCard({ label, value, hint }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "rt-card p-3 h-100",
		children: [
			/* @__PURE__ */ jsx("div", {
				className: "rt-filter-label mb-1",
				children: label
			}),
			/* @__PURE__ */ jsx("div", {
				className: "h4 fw-bold mb-1",
				children: value
			}),
			/* @__PURE__ */ jsx("div", {
				className: "text-muted small",
				children: hint
			})
		]
	});
}
var RESULT_LABELS = {
	ok: "Synced",
	unconfigured: "Not configured",
	cooling_down: "Paused after failures",
	failed: "Failed"
};
/**
* Search terms, location and the auto-sync schedule, plus the result of the last sync.
*/
function SyncPanel({ sync, isSyncing, onSyncAll }) {
	const { errors } = usePage().props;
	const settings = sync.settings;
	const form = useForm({
		queries: settings.queries.join("\n"),
		location: settings.location ?? "",
		country: settings.country ?? "",
		remote_only: settings.remote_only,
		per_page: settings.per_page,
		auto_sync: settings.auto_sync,
		interval_hours: settings.interval_hours
	});
	const submit = (event) => {
		event.preventDefault();
		form.transform((data) => ({
			...data,
			queries: data.queries.split(/[\n,]/).map((query) => query.trim()).filter(Boolean),
			country: data.country.trim() || null,
			location: data.location.trim() || null
		}));
		form.put("/admin/jobs/sync-settings", { preserveScroll: true });
	};
	const lastRun = sync.last_run;
	return /* @__PURE__ */ jsxs("div", {
		className: "row g-4 mb-4",
		children: [/* @__PURE__ */ jsx("div", {
			className: "col-xl-7",
			children: /* @__PURE__ */ jsxs("form", {
				className: "rt-card p-3 p-lg-4 h-100",
				onSubmit: submit,
				noValidate: true,
				children: [
					/* @__PURE__ */ jsxs("h2", {
						className: "rt-card-title mb-1",
						children: [/* @__PURE__ */ jsx("i", { className: "bi bi-sliders" }), "Sync settings"]
					}),
					/* @__PURE__ */ jsx("p", {
						className: "text-muted small mb-3",
						children: "What to fetch from the providers. Each search term is fetched from every configured provider."
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "row g-3",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "col-12",
								children: [
									/* @__PURE__ */ jsxs("label", {
										htmlFor: "queries",
										className: "form-label fw-semibold small",
										children: ["Search terms ", /* @__PURE__ */ jsxs("span", {
											className: "text-muted fw-normal",
											children: [
												"(one per line, up to ",
												sync.max_queries,
												")"
											]
										})]
									}),
									/* @__PURE__ */ jsx("textarea", {
										id: "queries",
										rows: "3",
										className: `form-control ${form.errors.queries || errors.queries ? "is-invalid" : ""}`,
										placeholder: "Laravel developer\nReact developer\nData analyst",
										value: form.data.queries,
										onChange: (event) => form.setData("queries", event.target.value)
									}),
									(form.errors.queries || errors.queries) && /* @__PURE__ */ jsx("div", {
										className: "invalid-feedback",
										children: form.errors.queries || errors.queries
									})
								]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "col-md-5",
								children: [/* @__PURE__ */ jsx("label", {
									htmlFor: "location",
									className: "form-label fw-semibold small",
									children: "Location"
								}), /* @__PURE__ */ jsx("input", {
									id: "location",
									className: "form-control",
									placeholder: "e.g. Lahore or London",
									value: form.data.location,
									onChange: (event) => form.setData("location", event.target.value)
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "col-6 col-md-3",
								children: [
									/* @__PURE__ */ jsx("label", {
										htmlFor: "country",
										className: "form-label fw-semibold small",
										children: "Country code"
									}),
									/* @__PURE__ */ jsx("input", {
										id: "country",
										className: `form-control text-uppercase ${form.errors.country ? "is-invalid" : ""}`,
										maxLength: 2,
										placeholder: "gb",
										value: form.data.country,
										onChange: (event) => form.setData("country", event.target.value)
									}),
									form.errors.country && /* @__PURE__ */ jsx("div", {
										className: "invalid-feedback",
										children: form.errors.country
									})
								]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "col-6 col-md-4",
								children: [/* @__PURE__ */ jsx("label", {
									htmlFor: "per_page",
									className: "form-label fw-semibold small",
									children: "Results per provider"
								}), /* @__PURE__ */ jsx("select", {
									id: "per_page",
									className: "form-select",
									value: form.data.per_page,
									onChange: (event) => form.setData("per_page", Number(event.target.value)),
									children: [
										10,
										25,
										50,
										100
									].map((value) => /* @__PURE__ */ jsx("option", {
										value,
										children: value
									}, value))
								})]
							}),
							/* @__PURE__ */ jsx("div", {
								className: "col-md-5 d-flex align-items-center",
								children: /* @__PURE__ */ jsxs("div", {
									className: "form-check form-switch",
									children: [/* @__PURE__ */ jsx("input", {
										id: "remote_only",
										type: "checkbox",
										role: "switch",
										className: "form-check-input",
										checked: form.data.remote_only,
										onChange: (event) => form.setData("remote_only", event.target.checked)
									}), /* @__PURE__ */ jsx("label", {
										htmlFor: "remote_only",
										className: "form-check-label small",
										children: "Remote jobs only"
									})]
								})
							}),
							/* @__PURE__ */ jsx("div", {
								className: "col-md-7",
								children: /* @__PURE__ */ jsxs("div", {
									className: "d-flex flex-wrap align-items-center gap-2",
									children: [/* @__PURE__ */ jsxs("div", {
										className: "form-check form-switch mb-0",
										children: [/* @__PURE__ */ jsx("input", {
											id: "auto_sync",
											type: "checkbox",
											role: "switch",
											className: "form-check-input",
											checked: form.data.auto_sync,
											onChange: (event) => form.setData("auto_sync", event.target.checked)
										}), /* @__PURE__ */ jsx("label", {
											htmlFor: "auto_sync",
											className: "form-check-label small fw-semibold",
											children: "Auto-sync every"
										})]
									}), /* @__PURE__ */ jsx("select", {
										className: "form-select form-select-sm w-auto",
										"aria-label": "Auto-sync interval",
										value: form.data.interval_hours,
										onChange: (event) => form.setData("interval_hours", Number(event.target.value)),
										disabled: !form.data.auto_sync,
										children: sync.intervals.map((hours) => /* @__PURE__ */ jsx("option", {
											value: hours,
											children: hours === 24 ? "day" : `${hours} hour${hours === 1 ? "" : "s"}`
										}, hours))
									})]
								})
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "d-flex flex-wrap gap-2 mt-4",
						children: [
							/* @__PURE__ */ jsx("button", {
								type: "submit",
								className: "btn rt-btn-primary px-4 py-2",
								disabled: form.processing || !form.isDirty,
								children: form.processing ? "Saving..." : "Save settings"
							}),
							/* @__PURE__ */ jsx("button", {
								type: "button",
								className: "btn btn-light border",
								onClick: onSyncAll,
								disabled: isSyncing || form.isDirty,
								children: isSyncing ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("span", {
									className: "spinner-border spinner-border-sm me-2",
									"aria-hidden": "true"
								}), "Syncing..."] }) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("i", { className: "bi bi-arrow-repeat me-1" }), "Sync all now"] })
							}),
							form.isDirty && /* @__PURE__ */ jsx("small", {
								className: "text-muted align-self-center",
								children: "Save your changes before syncing."
							})
						]
					})
				]
			})
		}), /* @__PURE__ */ jsx("div", {
			className: "col-xl-5",
			children: /* @__PURE__ */ jsxs("section", {
				className: "rt-card p-3 p-lg-4 h-100",
				children: [
					/* @__PURE__ */ jsxs("h2", {
						className: "rt-card-title mb-3",
						children: [/* @__PURE__ */ jsx("i", { className: "bi bi-clock-history" }), "Schedule"]
					}),
					sync.scheduler_running ? /* @__PURE__ */ jsxs("div", {
						className: "alert alert-success py-2 small d-flex gap-2 align-items-start",
						children: [/* @__PURE__ */ jsx("i", { className: "bi bi-check-circle-fill mt-1" }), /* @__PURE__ */ jsx("span", { children: "The scheduler is running, so auto-sync will run on time." })]
					}) : /* @__PURE__ */ jsxs("div", {
						className: "alert alert-warning py-2 small",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "fw-semibold mb-1",
								children: [/* @__PURE__ */ jsx("i", { className: "bi bi-exclamation-triangle me-1" }), "The scheduler is not running"]
							}),
							"Auto-sync only runs when Laravel's scheduler does. Locally, keep ",
							/* @__PURE__ */ jsx("code", { children: "php artisan schedule:work" }),
							" running. On the server, add this cron entry:",
							/* @__PURE__ */ jsx("code", {
								className: "d-block mt-1 text-break",
								children: "* * * * * cd /path/to/app && php artisan schedule:run >> /dev/null 2>&1"
							})
						]
					}),
					/* @__PURE__ */ jsxs("dl", {
						className: "row small mb-3",
						children: [
							/* @__PURE__ */ jsx("dt", {
								className: "col-5 text-muted fw-normal",
								children: "Auto-sync"
							}),
							/* @__PURE__ */ jsx("dd", {
								className: "col-7",
								children: settings.auto_sync ? `Every ${settings.interval_hours === 24 ? "day" : `${settings.interval_hours} h`}` : "Off"
							}),
							/* @__PURE__ */ jsx("dt", {
								className: "col-5 text-muted fw-normal",
								children: "Next auto-sync"
							}),
							/* @__PURE__ */ jsx("dd", {
								className: "col-7",
								children: sync.next_auto_sync_at ? formatDateTime$1(sync.next_auto_sync_at) : "—"
							}),
							/* @__PURE__ */ jsx("dt", {
								className: "col-5 text-muted fw-normal",
								children: "Last sync"
							}),
							/* @__PURE__ */ jsx("dd", {
								className: "col-7",
								children: lastRun ? `${formatDateTime$1(lastRun.finished_at)} (${lastRun.trigger === "auto" ? "automatic" : "manual"})` : "Never"
							})
						]
					}),
					lastRun && Object.keys(lastRun.providers ?? {}).length > 0 && /* @__PURE__ */ jsx("ul", {
						className: "list-unstyled small mb-0 d-grid gap-2",
						children: Object.entries(lastRun.providers).map(([name, row]) => /* @__PURE__ */ jsxs("li", {
							className: "d-flex justify-content-between gap-2 border rounded-3 px-3 py-2",
							children: [/* @__PURE__ */ jsx("span", {
								className: "text-capitalize fw-semibold",
								children: name
							}), /* @__PURE__ */ jsx("span", {
								className: row.status === "ok" ? "text-success" : "text-muted",
								children: row.status === "ok" ? `${number(row.fetched)} fetched · ${number(row.created)} new` : RESULT_LABELS[row.status] ?? row.status
							})]
						}, name))
					})
				]
			})
		})]
	});
}
function JobMetrics({ providers, sourceEvents, usage, budgets, generatedAt, sync, seo }) {
	const today = usage?.today ?? {};
	const { errors } = usePage().props;
	const [syncingProvider, setSyncingProvider] = useState(null);
	const isSyncing = syncingProvider !== null;
	const runSync = (provider = null) => {
		setSyncingProvider(provider ?? "all");
		router.post("/admin/jobs/sync", provider ? { provider } : {}, {
			preserveScroll: true,
			onFinish: () => setSyncingProvider(null)
		});
	};
	return /* @__PURE__ */ jsxs(AdminLayout, {
		title: "Job feeds",
		subtitle: /* @__PURE__ */ jsxs(Fragment, { children: ["Provider health, feed sync history and AI usage.", generatedAt && /* @__PURE__ */ jsxs("span", { children: [
			" Updated ",
			formatDateTime$1(generatedAt),
			"."
		] })] }),
		seo,
		actions: /* @__PURE__ */ jsxs(Fragment, { children: [
			/* @__PURE__ */ jsxs("button", {
				type: "button",
				className: "btn btn-light border",
				onClick: () => router.reload({ only: [
					"providers",
					"sourceEvents",
					"usage",
					"generatedAt",
					"sync"
				] }),
				children: [/* @__PURE__ */ jsx("i", { className: "bi bi-arrow-clockwise me-2" }), "Refresh"]
			}),
			/* @__PURE__ */ jsx(Link, {
				href: "/jobs",
				className: "btn btn-light border",
				children: "View jobs"
			}),
			/* @__PURE__ */ jsx("button", {
				type: "button",
				className: "btn rt-btn-primary px-3",
				onClick: () => runSync(),
				disabled: isSyncing,
				children: syncingProvider === "all" ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("span", {
					className: "spinner-border spinner-border-sm me-2",
					"aria-hidden": "true"
				}), "Syncing..."] }) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("i", { className: "bi bi-arrow-repeat me-2" }), "Sync all now"] })
			})
		] }),
		children: [
			errors.sync && /* @__PURE__ */ jsxs("div", {
				className: "alert alert-danger d-flex gap-2 align-items-start",
				role: "alert",
				children: [/* @__PURE__ */ jsx("i", { className: "bi bi-exclamation-octagon mt-1" }), /* @__PURE__ */ jsx("span", { children: errors.sync })]
			}),
			/* @__PURE__ */ jsx(SyncPanel, {
				sync,
				isSyncing,
				onSyncAll: () => runSync()
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "row g-3 mb-4",
				children: [
					/* @__PURE__ */ jsx("div", {
						className: "col-6 col-lg-3",
						children: /* @__PURE__ */ jsx(UsageCard, {
							label: "AI requests today",
							value: number(today.requests),
							hint: "Across all users"
						})
					}),
					/* @__PURE__ */ jsx("div", {
						className: "col-6 col-lg-3",
						children: /* @__PURE__ */ jsx(UsageCard, {
							label: "Tokens today",
							value: number(today.tokens),
							hint: `Limit ${number(budgets.daily_token_limit)}`
						})
					}),
					/* @__PURE__ */ jsx("div", {
						className: "col-6 col-lg-3",
						children: /* @__PURE__ */ jsx(UsageCard, {
							label: "AI failures today",
							value: number(today.failures),
							hint: "Provider or response errors"
						})
					}),
					/* @__PURE__ */ jsx("div", {
						className: "col-6 col-lg-3",
						children: /* @__PURE__ */ jsx(UsageCard, {
							label: "Estimated cost today",
							value: `$${Number(today.estimated_cost || 0).toFixed(4)}`,
							hint: "Configured token rates"
						})
					})
				]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "rt-card p-3 p-lg-4 mb-4",
				children: [/* @__PURE__ */ jsx("div", {
					className: "d-flex flex-wrap justify-content-between align-items-end gap-2 mb-3",
					children: /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
						className: "h6 fw-bold mb-1",
						children: "Providers"
					}), /* @__PURE__ */ jsx("p", {
						className: "text-muted small mb-0",
						children: "Active postings and the last successful sync for each source."
					})] })
				}), /* @__PURE__ */ jsx("div", {
					className: "table-responsive",
					children: /* @__PURE__ */ jsxs("table", {
						className: "table table-sm align-middle mb-0",
						children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", {
							className: "text-muted small",
							children: [
								/* @__PURE__ */ jsx("th", {
									scope: "col",
									children: "Provider"
								}),
								/* @__PURE__ */ jsx("th", {
									scope: "col",
									children: "Status"
								}),
								/* @__PURE__ */ jsx("th", {
									scope: "col",
									className: "text-end",
									children: "Active postings"
								}),
								/* @__PURE__ */ jsx("th", {
									scope: "col",
									children: "Last sync"
								}),
								/* @__PURE__ */ jsx("th", {
									scope: "col",
									children: "Last error"
								}),
								/* @__PURE__ */ jsx("th", {
									scope: "col",
									className: "text-end",
									children: "Sync"
								})
							]
						}) }), /* @__PURE__ */ jsx("tbody", { children: providers.map((provider) => {
							const tone = providerTone(provider);
							return /* @__PURE__ */ jsxs("tr", { children: [
								/* @__PURE__ */ jsx("td", {
									className: "fw-semibold text-capitalize",
									children: provider.name
								}),
								/* @__PURE__ */ jsxs("td", { children: [
									/* @__PURE__ */ jsx("span", {
										className: `badge ${tone.className}`,
										children: tone.label
									}),
									!provider.configured && provider.setup_hint && /* @__PURE__ */ jsx("div", {
										className: "text-muted small mt-1",
										children: provider.setup_hint
									}),
									provider.cooling_down_until && /* @__PURE__ */ jsxs("div", {
										className: "text-muted small mt-1",
										children: ["Until ", formatDateTime$1(provider.cooling_down_until)]
									})
								] }),
								/* @__PURE__ */ jsx("td", {
									className: "text-end",
									children: number(provider.active_postings)
								}),
								/* @__PURE__ */ jsx("td", {
									className: "small",
									children: formatDateTime$1(provider.last_success_at) || /* @__PURE__ */ jsx("span", {
										className: "text-muted",
										children: "Never"
									})
								}),
								/* @__PURE__ */ jsx("td", {
									className: "small",
									children: provider.last_error_message ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("div", { children: [provider.last_status_code && /* @__PURE__ */ jsx("span", {
										className: "badge text-bg-light border me-1",
										children: provider.last_status_code
									}), /* @__PURE__ */ jsx("span", {
										className: "text-danger",
										children: provider.last_error_message
									})] }), /* @__PURE__ */ jsx("div", {
										className: "text-muted",
										children: formatDateTime$1(provider.last_error_at)
									})] }) : /* @__PURE__ */ jsx("span", {
										className: "text-muted",
										children: "None"
									})
								}),
								/* @__PURE__ */ jsx("td", {
									className: "text-end",
									children: /* @__PURE__ */ jsx("button", {
										type: "button",
										className: "btn btn-sm btn-light border",
										disabled: !provider.configured || isSyncing,
										title: provider.configured ? `Sync ${provider.name} now` : "Add its API keys to .env first",
										onClick: () => runSync(provider.name),
										children: syncingProvider === provider.name ? /* @__PURE__ */ jsx("span", {
											className: "spinner-border spinner-border-sm",
											"aria-label": "Syncing"
										}) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("i", { className: "bi bi-arrow-repeat me-1" }), "Sync"] })
									})
								})
							] }, provider.name);
						}) })]
					})
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "row g-4",
				children: [/* @__PURE__ */ jsx("div", {
					className: "col-12 col-xl-7",
					children: /* @__PURE__ */ jsxs("section", {
						className: "rt-card p-3 p-lg-4 h-100",
						children: [
							/* @__PURE__ */ jsx("h2", {
								className: "h6 fw-bold mb-1",
								children: "AI usage by day"
							}),
							/* @__PURE__ */ jsx("p", {
								className: "text-muted small mb-3",
								children: "Requests, tokens and failures recorded by the LLM tracker."
							}),
							/* @__PURE__ */ jsx("div", {
								className: "table-responsive",
								children: /* @__PURE__ */ jsxs("table", {
									className: "table table-sm align-middle mb-0",
									children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", {
										className: "text-muted small",
										children: [
											/* @__PURE__ */ jsx("th", {
												scope: "col",
												children: "Date"
											}),
											/* @__PURE__ */ jsx("th", {
												scope: "col",
												className: "text-end",
												children: "Requests"
											}),
											/* @__PURE__ */ jsx("th", {
												scope: "col",
												className: "text-end",
												children: "Failures"
											}),
											/* @__PURE__ */ jsx("th", {
												scope: "col",
												className: "text-end",
												children: "Tokens"
											}),
											/* @__PURE__ */ jsx("th", {
												scope: "col",
												className: "text-end",
												children: "Cost"
											})
										]
									}) }), /* @__PURE__ */ jsxs("tbody", { children: [usage.daily.length === 0 && /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", {
										colSpan: "5",
										className: "text-center text-muted small py-4",
										children: "No AI usage recorded yet."
									}) }), usage.daily.map((day) => /* @__PURE__ */ jsxs("tr", { children: [
										/* @__PURE__ */ jsx("td", {
											className: "small",
											children: day.date
										}),
										/* @__PURE__ */ jsx("td", {
											className: "text-end",
											children: number(day.requests)
										}),
										/* @__PURE__ */ jsx("td", {
											className: "text-end",
											children: number(day.failures)
										}),
										/* @__PURE__ */ jsx("td", {
											className: "text-end",
											children: number(day.tokens)
										}),
										/* @__PURE__ */ jsxs("td", {
											className: "text-end",
											children: ["$", Number(day.estimated_cost || 0).toFixed(4)]
										})
									] }, day.date))] })]
								})
							})
						]
					})
				}), /* @__PURE__ */ jsx("div", {
					className: "col-12 col-xl-5",
					children: /* @__PURE__ */ jsxs("section", {
						className: "rt-card p-3 p-lg-4 h-100",
						children: [
							/* @__PURE__ */ jsx("h2", {
								className: "h6 fw-bold mb-1",
								children: "Top users today"
							}),
							/* @__PURE__ */ jsxs("p", {
								className: "text-muted small mb-3",
								children: [
									"Per-user daily token budget: ",
									number(budgets.daily_user_token_limit),
									"."
								]
							}),
							/* @__PURE__ */ jsx("div", {
								className: "table-responsive",
								children: /* @__PURE__ */ jsxs("table", {
									className: "table table-sm align-middle mb-0",
									children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", {
										className: "text-muted small",
										children: [
											/* @__PURE__ */ jsx("th", {
												scope: "col",
												children: "User"
											}),
											/* @__PURE__ */ jsx("th", {
												scope: "col",
												className: "text-end",
												children: "Requests"
											}),
											/* @__PURE__ */ jsx("th", {
												scope: "col",
												className: "text-end",
												children: "Tokens"
											})
										]
									}) }), /* @__PURE__ */ jsxs("tbody", { children: [usage.topUsers.length === 0 && /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", {
										colSpan: "3",
										className: "text-center text-muted small py-4",
										children: "No user AI usage today."
									}) }), usage.topUsers.map((row) => /* @__PURE__ */ jsxs("tr", { children: [
										/* @__PURE__ */ jsxs("td", {
											className: "small",
											children: [/* @__PURE__ */ jsx("div", {
												className: "fw-semibold",
												children: row.name || `User #${row.user_id}`
											}), /* @__PURE__ */ jsx("div", {
												className: "text-muted",
												children: row.email
											})]
										}),
										/* @__PURE__ */ jsx("td", {
											className: "text-end",
											children: number(row.requests)
										}),
										/* @__PURE__ */ jsxs("td", {
											className: "text-end",
											children: [number(row.tokens), budgets.daily_user_token_limit > 0 && /* @__PURE__ */ jsxs("div", {
												className: "text-muted small",
												children: [Math.min(100, Math.round(row.tokens / budgets.daily_user_token_limit * 100)), "%"]
											})]
										})
									] }, row.user_id))] })]
								})
							})
						]
					})
				})]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "rt-card p-3 p-lg-4 mt-4",
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "h6 fw-bold mb-1",
						children: "Provider error log"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "text-muted small mb-3",
						children: "Latest failures with provider status codes."
					}),
					/* @__PURE__ */ jsx("div", {
						className: "table-responsive",
						children: /* @__PURE__ */ jsxs("table", {
							className: "table table-sm align-middle mb-0",
							children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", {
								className: "text-muted small",
								children: [
									/* @__PURE__ */ jsx("th", {
										scope: "col",
										children: "When"
									}),
									/* @__PURE__ */ jsx("th", {
										scope: "col",
										children: "Provider"
									}),
									/* @__PURE__ */ jsx("th", {
										scope: "col",
										children: "Status"
									}),
									/* @__PURE__ */ jsx("th", {
										scope: "col",
										children: "Message"
									})
								]
							}) }), /* @__PURE__ */ jsxs("tbody", { children: [sourceEvents.length === 0 && /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", {
								colSpan: "4",
								className: "text-center text-muted small py-4",
								children: "No provider errors recorded."
							}) }), sourceEvents.map((event) => /* @__PURE__ */ jsxs("tr", { children: [
								/* @__PURE__ */ jsx("td", {
									className: "small text-nowrap",
									children: formatDateTime$1(event.created_at)
								}),
								/* @__PURE__ */ jsx("td", {
									className: "small text-capitalize",
									children: event.provider
								}),
								/* @__PURE__ */ jsx("td", {
									className: "small",
									children: event.status_code ? /* @__PURE__ */ jsx("span", {
										className: "badge text-bg-light border",
										children: event.status_code
									}) : /* @__PURE__ */ jsx("span", {
										className: "text-muted",
										children: "n/a"
									})
								}),
								/* @__PURE__ */ jsx("td", {
									className: "small text-danger",
									children: event.message
								})
							] }, event.id))] })]
						})
					})
				]
			})
		]
	});
}
//#endregion
//#region resources/js/Pages/Admin/Messages.jsx
var Messages_exports = /* @__PURE__ */ __exportAll({ default: () => Messages });
function Messages({ messages, unreadCount, onlyUnread, seo }) {
	const setRead = (message, read) => router.patch(`/admin/messages/${message.id}`, { read }, { preserveScroll: true });
	const remove = (message) => {
		if (window.confirm("Delete this message?")) router.delete(`/admin/messages/${message.id}`, { preserveScroll: true });
	};
	return /* @__PURE__ */ jsxs(AdminLayout, {
		title: "Messages",
		subtitle: `Sent from the contact page · ${unreadCount} unread`,
		seo,
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "rt-tabs mb-3",
				role: "tablist",
				children: [/* @__PURE__ */ jsx(Link, {
					href: "/admin/messages",
					className: `rt-tab ${!onlyUnread ? "is-active" : ""}`,
					preserveScroll: true,
					children: "All"
				}), /* @__PURE__ */ jsxs(Link, {
					href: "/admin/messages?unread=1",
					className: `rt-tab ${onlyUnread ? "is-active" : ""}`,
					preserveScroll: true,
					children: ["Unread", /* @__PURE__ */ jsx("span", {
						className: "rt-count",
						children: unreadCount
					})]
				})]
			}),
			messages.data.length === 0 && /* @__PURE__ */ jsxs("div", {
				className: "rt-card p-5 text-center text-muted",
				children: [/* @__PURE__ */ jsx("i", {
					className: "bi bi-inbox",
					style: { fontSize: "2rem" }
				}), /* @__PURE__ */ jsx("p", {
					className: "mt-2 mb-0",
					children: onlyUnread ? "No unread messages." : "No messages yet."
				})]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "d-grid gap-3",
				children: messages.data.map((message) => /* @__PURE__ */ jsxs("details", {
					className: `rt-card rt-message ${message.is_read ? "" : "is-unread"}`,
					onToggle: (event) => {
						if (event.currentTarget.open && !message.is_read) setRead(message, true);
					},
					children: [/* @__PURE__ */ jsxs("summary", {
						className: "d-flex flex-wrap align-items-center gap-2 p-3",
						children: [
							!message.is_read && /* @__PURE__ */ jsx("span", {
								className: "rt-admin-dot",
								"aria-label": "Unread"
							}),
							/* @__PURE__ */ jsx("span", {
								className: "fw-semibold",
								children: message.subject
							}),
							/* @__PURE__ */ jsxs("span", {
								className: "text-muted small",
								children: [
									"from ",
									message.name,
									" <",
									message.email,
									">"
								]
							}),
							/* @__PURE__ */ jsx("span", {
								className: "ms-auto small text-muted text-nowrap",
								children: formatDate$6(message.created_at, true)
							})
						]
					}), /* @__PURE__ */ jsxs("div", {
						className: "px-3 pb-3",
						children: [/* @__PURE__ */ jsx("div", {
							className: "rt-plain mb-3",
							style: { whiteSpace: "pre-wrap" },
							children: message.message
						}), /* @__PURE__ */ jsxs("div", {
							className: "d-flex flex-wrap gap-2",
							children: [
								/* @__PURE__ */ jsxs("a", {
									href: `mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`,
									className: "btn btn-sm rt-btn-primary px-3 py-1",
									children: [/* @__PURE__ */ jsx("i", { className: "bi bi-reply me-1" }), "Reply by email"]
								}),
								message.user_id && /* @__PURE__ */ jsx(Link, {
									href: `/admin/users/${message.user_id}`,
									className: "btn btn-sm btn-light border",
									children: "View user"
								}),
								/* @__PURE__ */ jsx("button", {
									type: "button",
									className: "btn btn-sm btn-light border",
									onClick: () => setRead(message, !message.is_read),
									children: message.is_read ? "Mark unread" : "Mark read"
								}),
								/* @__PURE__ */ jsx("button", {
									type: "button",
									className: "btn btn-sm btn-light border text-danger ms-auto",
									onClick: () => remove(message),
									children: /* @__PURE__ */ jsx("i", { className: "bi bi-trash" })
								})
							]
						})]
					})]
				}, message.id))
			}),
			/* @__PURE__ */ jsx(Pagination, { paginator: messages })
		]
	});
}
//#endregion
//#region resources/js/Pages/Admin/Posts/Form.jsx
var Form_exports = /* @__PURE__ */ __exportAll({ default: () => PostForm });
var slugify = (value) => value.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
var MARKDOWN_HELP = [
	["## Heading", "Section heading"],
	["**bold**", "Bold text"],
	["- item", "Bullet list"],
	["1. item", "Numbered list"],
	["[text](https://...)", "Link"],
	["> quote", "Quote"]
];
function PostForm({ post, categories, seo }) {
	const isNew = post === null;
	const form = useForm({
		title: post?.title ?? "",
		slug: post?.slug ?? "",
		category: post?.category ?? categories[0] ?? "CV tips",
		excerpt: post?.excerpt ?? "",
		meta_description: post?.meta_description ?? "",
		body: post?.body ?? "",
		status: post?.status ?? "draft",
		published_at: post?.published_at ?? ""
	});
	const words = form.data.body.trim() ? form.data.body.trim().split(/\s+/).length : 0;
	const submit = (status) => {
		form.transform((data) => ({
			...data,
			status
		}));
		if (isNew) form.post("/admin/posts", { preserveScroll: true });
		else form.put(`/admin/posts/${post.id}`, { preserveScroll: true });
	};
	const input = (name, label, props = {}, help = null) => /* @__PURE__ */ jsxs("div", {
		className: "mb-3",
		children: [
			/* @__PURE__ */ jsx("label", {
				htmlFor: name,
				className: "form-label fw-semibold small",
				children: label
			}),
			/* @__PURE__ */ jsx("input", {
				id: name,
				className: `form-control ${form.errors[name] ? "is-invalid" : ""}`,
				value: form.data[name],
				onChange: (event) => form.setData(name, event.target.value),
				...props
			}),
			form.errors[name] ? /* @__PURE__ */ jsx("div", {
				className: "invalid-feedback",
				children: form.errors[name]
			}) : help && /* @__PURE__ */ jsx("div", {
				className: "form-text",
				children: help
			})
		]
	});
	return /* @__PURE__ */ jsx(AdminLayout, {
		title: isNew ? "New post" : "Edit post",
		subtitle: isNew ? "Write in Markdown. Save as a draft, then publish when it is ready." : post.is_live ? "This post is live." : "This post is not live yet.",
		seo,
		actions: /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs(Link, {
			href: "/admin/posts",
			className: "btn btn-light border",
			children: [/* @__PURE__ */ jsx("i", { className: "bi bi-arrow-left me-1" }), "All posts"]
		}), !isNew && /* @__PURE__ */ jsxs("a", {
			href: post.url,
			target: "_blank",
			rel: "noreferrer",
			className: "btn btn-light border",
			children: [/* @__PURE__ */ jsx("i", { className: "bi bi-box-arrow-up-right me-1" }), post.is_live ? "View" : "Preview"]
		})] }),
		children: /* @__PURE__ */ jsx("form", {
			onSubmit: (event) => {
				event.preventDefault();
				submit(form.data.status);
			},
			noValidate: true,
			children: /* @__PURE__ */ jsxs("div", {
				className: "row g-4",
				children: [/* @__PURE__ */ jsx("div", {
					className: "col-xl-8",
					children: /* @__PURE__ */ jsxs("section", {
						className: "rt-card p-3 p-lg-4",
						children: [
							input("title", "Title", {
								maxLength: 160,
								onBlur: () => {
									if (!form.data.slug) form.setData("slug", slugify(form.data.title));
								}
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "mb-3",
								children: [
									/* @__PURE__ */ jsxs("label", {
										htmlFor: "excerpt",
										className: "form-label fw-semibold small",
										children: ["Summary ", /* @__PURE__ */ jsx("span", {
											className: "text-muted fw-normal",
											children: "(shown on the blog list, up to 300 characters)"
										})]
									}),
									/* @__PURE__ */ jsx("textarea", {
										id: "excerpt",
										rows: "2",
										maxLength: 300,
										className: `form-control ${form.errors.excerpt ? "is-invalid" : ""}`,
										value: form.data.excerpt,
										onChange: (event) => form.setData("excerpt", event.target.value)
									}),
									form.errors.excerpt && /* @__PURE__ */ jsx("div", {
										className: "invalid-feedback",
										children: form.errors.excerpt
									})
								]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "mb-2",
								children: [
									/* @__PURE__ */ jsxs("div", {
										className: "d-flex justify-content-between align-items-end",
										children: [/* @__PURE__ */ jsxs("label", {
											htmlFor: "body",
											className: "form-label fw-semibold small mb-1",
											children: ["Article ", /* @__PURE__ */ jsx("span", {
												className: "text-muted fw-normal",
												children: "(Markdown)"
											})]
										}), /* @__PURE__ */ jsxs("small", {
											className: words < 300 ? "text-warning" : "text-muted",
											children: [
												words.toLocaleString(),
												" words",
												words < 300 && " · aim for 600+"
											]
										})]
									}),
									/* @__PURE__ */ jsx("textarea", {
										id: "body",
										rows: "22",
										className: `form-control rt-key-mono ${form.errors.body ? "is-invalid" : ""}`,
										style: {
											fontSize: ".875rem",
											lineHeight: 1.6
										},
										value: form.data.body,
										onChange: (event) => form.setData("body", event.target.value)
									}),
									form.errors.body && /* @__PURE__ */ jsx("div", {
										className: "invalid-feedback",
										children: form.errors.body
									})
								]
							}),
							/* @__PURE__ */ jsx("div", {
								className: "d-flex flex-wrap gap-2 small text-muted",
								children: MARKDOWN_HELP.map(([syntax, meaning]) => /* @__PURE__ */ jsxs("span", {
									className: "badge text-bg-light border fw-normal",
									children: [
										/* @__PURE__ */ jsx("code", { children: syntax }),
										" ",
										meaning
									]
								}, syntax))
							})
						]
					})
				}), /* @__PURE__ */ jsxs("div", {
					className: "col-xl-4",
					children: [/* @__PURE__ */ jsxs("section", {
						className: "rt-card p-3 p-lg-4 mb-4",
						children: [
							/* @__PURE__ */ jsxs("h2", {
								className: "rt-card-title mb-3",
								children: [/* @__PURE__ */ jsx("i", { className: "bi bi-send" }), "Publish"]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "mb-3",
								children: [
									/* @__PURE__ */ jsx("label", {
										htmlFor: "published_at",
										className: "form-label fw-semibold small",
										children: "Publish date"
									}),
									/* @__PURE__ */ jsx("input", {
										id: "published_at",
										type: "datetime-local",
										className: `form-control ${form.errors.published_at ? "is-invalid" : ""}`,
										value: form.data.published_at,
										onChange: (event) => form.setData("published_at", event.target.value)
									}),
									/* @__PURE__ */ jsx("div", {
										className: "form-text",
										children: "Leave empty to publish now. A future date schedules the post."
									})
								]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "d-grid gap-2",
								children: [/* @__PURE__ */ jsxs("button", {
									type: "button",
									className: "btn rt-btn-primary",
									disabled: form.processing,
									onClick: () => submit("published"),
									children: [/* @__PURE__ */ jsx("i", { className: "bi bi-globe me-1" }), post?.status === "published" ? "Save and keep published" : "Publish"]
								}), /* @__PURE__ */ jsx("button", {
									type: "button",
									className: "btn btn-light border",
									disabled: form.processing,
									onClick: () => submit("draft"),
									children: post?.status === "published" ? "Unpublish (move to drafts)" : "Save draft"
								})]
							})
						]
					}), /* @__PURE__ */ jsxs("section", {
						className: "rt-card p-3 p-lg-4",
						children: [
							/* @__PURE__ */ jsxs("h2", {
								className: "rt-card-title mb-3",
								children: [/* @__PURE__ */ jsx("i", { className: "bi bi-search" }), "Details & SEO"]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "mb-3",
								children: [
									/* @__PURE__ */ jsx("label", {
										htmlFor: "category",
										className: "form-label fw-semibold small",
										children: "Category"
									}),
									/* @__PURE__ */ jsx("input", {
										id: "category",
										list: "post-categories",
										className: `form-control ${form.errors.category ? "is-invalid" : ""}`,
										value: form.data.category,
										onChange: (event) => form.setData("category", event.target.value)
									}),
									/* @__PURE__ */ jsx("datalist", {
										id: "post-categories",
										children: categories.map((category) => /* @__PURE__ */ jsx("option", { value: category }, category))
									}),
									form.errors.category && /* @__PURE__ */ jsx("div", {
										className: "invalid-feedback",
										children: form.errors.category
									})
								]
							}),
							input("slug", "URL slug", { maxLength: 180 }, `/blog/${form.data.slug || slugify(form.data.title) || "your-post"}`),
							/* @__PURE__ */ jsxs("div", {
								className: "mb-0",
								children: [
									/* @__PURE__ */ jsxs("label", {
										htmlFor: "meta_description",
										className: "form-label fw-semibold small",
										children: ["Search description ", /* @__PURE__ */ jsxs("span", {
											className: "text-muted fw-normal",
											children: [
												"(",
												form.data.meta_description.length,
												"/160)"
											]
										})]
									}),
									/* @__PURE__ */ jsx("textarea", {
										id: "meta_description",
										rows: "3",
										maxLength: 160,
										className: `form-control ${form.errors.meta_description ? "is-invalid" : ""}`,
										placeholder: "Shown in Google results. Defaults to the summary.",
										value: form.data.meta_description,
										onChange: (event) => form.setData("meta_description", event.target.value)
									}),
									form.errors.meta_description && /* @__PURE__ */ jsx("div", {
										className: "invalid-feedback",
										children: form.errors.meta_description
									})
								]
							})
						]
					})]
				})]
			})
		})
	});
}
//#endregion
//#region resources/js/Pages/Admin/Posts/Index.jsx
var Index_exports$7 = /* @__PURE__ */ __exportAll({ default: () => PostsIndex });
function PostsIndex({ posts, counts, status, seo }) {
	const tabs = [
		[
			null,
			"All",
			counts.all
		],
		[
			"published",
			"Published",
			counts.published
		],
		[
			"draft",
			"Drafts",
			counts.draft
		]
	];
	const remove = (post) => {
		if (window.confirm(`Delete "${post.title}"? This cannot be undone.`)) router.delete(`/admin/posts/${post.id}`, { preserveScroll: true });
	};
	return /* @__PURE__ */ jsxs(AdminLayout, {
		title: "Blog posts",
		subtitle: "Guides and articles: the written content search engines and AdSense reviewers look for.",
		seo,
		actions: /* @__PURE__ */ jsxs(Link, {
			href: "/admin/posts/create",
			className: "btn rt-btn-primary px-3",
			children: [/* @__PURE__ */ jsx("i", { className: "bi bi-plus-lg me-1" }), "New post"]
		}),
		children: [
			/* @__PURE__ */ jsx("div", {
				className: "rt-tabs mb-3",
				role: "tablist",
				children: tabs.map(([value, label, count]) => /* @__PURE__ */ jsxs(Link, {
					href: value ? `/admin/posts?status=${value}` : "/admin/posts",
					className: `rt-tab ${status === value ? "is-active" : ""}`,
					preserveScroll: true,
					children: [label, /* @__PURE__ */ jsx("span", {
						className: "rt-count",
						children: count
					})]
				}, label))
			}),
			/* @__PURE__ */ jsx("section", {
				className: "rt-card",
				children: /* @__PURE__ */ jsx("div", {
					className: "table-responsive",
					children: /* @__PURE__ */ jsxs("table", {
						className: "table rt-admin-table",
						children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
							/* @__PURE__ */ jsx("th", { children: "Title" }),
							/* @__PURE__ */ jsx("th", { children: "Category" }),
							/* @__PURE__ */ jsx("th", { children: "Status" }),
							/* @__PURE__ */ jsx("th", { children: "Updated" }),
							/* @__PURE__ */ jsx("th", {
								className: "text-end",
								children: "Actions"
							})
						] }) }), /* @__PURE__ */ jsxs("tbody", { children: [posts.data.length === 0 && /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsxs("td", {
							colSpan: "5",
							className: "text-center text-muted py-5",
							children: [
								"No posts yet. ",
								/* @__PURE__ */ jsx(Link, {
									href: "/admin/posts/create",
									children: "Write the first one"
								}),
								"."
							]
						}) }), posts.data.map((post) => /* @__PURE__ */ jsxs("tr", { children: [
							/* @__PURE__ */ jsxs("td", { children: [/* @__PURE__ */ jsx(Link, {
								href: `/admin/posts/${post.id}/edit`,
								className: "fw-semibold",
								children: post.title
							}), /* @__PURE__ */ jsxs("div", {
								className: "small text-muted",
								children: [
									"/blog/",
									post.slug,
									" · ",
									post.reading_minutes,
									" min read",
									post.author ? ` · ${post.author}` : ""
								]
							})] }),
							/* @__PURE__ */ jsx("td", {
								className: "small",
								children: post.category
							}),
							/* @__PURE__ */ jsxs("td", { children: [
								post.is_live && /* @__PURE__ */ jsx("span", {
									className: "badge text-bg-success",
									children: "Live"
								}),
								post.status === "published" && !post.is_live && /* @__PURE__ */ jsxs("span", {
									className: "badge text-bg-info",
									children: ["Scheduled ", formatDate$6(post.published_at)]
								}),
								post.status === "draft" && /* @__PURE__ */ jsx("span", {
									className: "badge text-bg-secondary",
									children: "Draft"
								})
							] }),
							/* @__PURE__ */ jsx("td", {
								className: "small text-muted text-nowrap",
								children: formatDate$6(post.updated_at, true)
							}),
							/* @__PURE__ */ jsx("td", {
								className: "text-end text-nowrap",
								children: /* @__PURE__ */ jsxs("div", {
									className: "btn-group btn-group-sm",
									children: [
										/* @__PURE__ */ jsx(Link, {
											href: `/admin/posts/${post.id}/edit`,
											className: "btn btn-light border",
											title: "Edit",
											children: /* @__PURE__ */ jsx("i", { className: "bi bi-pencil" })
										}),
										/* @__PURE__ */ jsx("a", {
											href: `/blog/${post.slug}`,
											target: "_blank",
											rel: "noreferrer",
											className: "btn btn-light border",
											title: post.is_live ? "View" : "Preview",
											children: /* @__PURE__ */ jsx("i", { className: "bi bi-box-arrow-up-right" })
										}),
										/* @__PURE__ */ jsx("button", {
											type: "button",
											className: "btn btn-light border text-danger",
											title: "Delete",
											onClick: () => remove(post),
											children: /* @__PURE__ */ jsx("i", { className: "bi bi-trash" })
										})
									]
								})
							})
						] }, post.id))] })]
					})
				})
			}),
			/* @__PURE__ */ jsx(Pagination, { paginator: posts })
		]
	});
}
//#endregion
//#region resources/js/Pages/Admin/Resumes/Index.jsx
var Index_exports$6 = /* @__PURE__ */ __exportAll({ default: () => ResumesIndex });
function ResumesIndex({ resumes, filters, templates, maxBulk, seo }) {
	const [form, setForm] = useState({
		search: filters.search ?? "",
		template: filters.template ?? "",
		owner: filters.owner ?? ""
	});
	const [selected, setSelected] = useState([]);
	const [bulkTemplate, setBulkTemplate] = useState(templates[0]?.value ?? "original");
	const [isWorking, setIsWorking] = useState(false);
	const pageIds = resumes.data.map((resume) => resume.id);
	const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
	const apply = (next) => {
		const query = Object.fromEntries(Object.entries({
			...next,
			user: filters.user ?? ""
		}).filter(([, value]) => value !== ""));
		setSelected([]);
		router.get("/admin/resumes", query, {
			preserveState: true,
			preserveScroll: true,
			replace: true
		});
	};
	const change = (field, value) => {
		const next = {
			...form,
			[field]: value
		};
		setForm(next);
		if (field !== "search") apply(next);
	};
	const toggle = (id) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
	const togglePage = () => setSelected((current) => allOnPageSelected ? current.filter((id) => !pageIds.includes(id)) : [.../* @__PURE__ */ new Set([...current, ...pageIds])].slice(0, maxBulk));
	const runBulk = (action) => {
		const label = templates.find((template) => template.value === bulkTemplate)?.label;
		const question = action === "delete" ? `Delete ${selected.length} tailored resume${selected.length === 1 ? "" : "s"} permanently?` : `Change ${selected.length} resume${selected.length === 1 ? "" : "s"} to the ${label} design?`;
		if (!window.confirm(question)) return;
		setIsWorking(true);
		router.post("/admin/resumes/bulk", {
			ids: selected,
			action,
			template: action === "template" ? bulkTemplate : null
		}, {
			preserveScroll: true,
			onSuccess: () => setSelected([]),
			onFinish: () => setIsWorking(false)
		});
	};
	return /* @__PURE__ */ jsxs(AdminLayout, {
		title: "Tailored resumes",
		subtitle: `${resumes.total.toLocaleString()} resume${resumes.total === 1 ? "" : "s"}${filters.user ? " for one user" : ""}`,
		seo,
		actions: filters.user ? /* @__PURE__ */ jsx(Link, {
			href: "/admin/resumes",
			className: "btn rt-btn-soft",
			children: "Show all users"
		}) : null,
		children: [
			/* @__PURE__ */ jsx("form", {
				className: "rt-card p-3 mb-3",
				onSubmit: (event) => {
					event.preventDefault();
					apply(form);
				},
				children: /* @__PURE__ */ jsxs("div", {
					className: "row g-2 align-items-end",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "col-md-5",
							children: [/* @__PURE__ */ jsx("label", {
								htmlFor: "search",
								className: "rt-filter-label",
								children: "Search"
							}), /* @__PURE__ */ jsxs("div", {
								className: "input-group",
								children: [/* @__PURE__ */ jsx("input", {
									id: "search",
									type: "search",
									className: "form-control rt-input",
									placeholder: "Job title, file name, user name or email",
									value: form.search,
									onChange: (event) => change("search", event.target.value)
								}), /* @__PURE__ */ jsx("button", {
									className: "btn rt-btn-soft",
									type: "submit",
									"aria-label": "Search",
									children: /* @__PURE__ */ jsx("i", { className: "bi bi-search" })
								})]
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "col-6 col-md-3",
							children: [/* @__PURE__ */ jsx("label", {
								htmlFor: "template",
								className: "rt-filter-label",
								children: "Design"
							}), /* @__PURE__ */ jsxs("select", {
								id: "template",
								className: "form-select",
								value: form.template,
								onChange: (event) => change("template", event.target.value),
								children: [/* @__PURE__ */ jsx("option", {
									value: "",
									children: "Any"
								}), templates.map((template) => /* @__PURE__ */ jsx("option", {
									value: template.value,
									children: template.label
								}, template.value))]
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "col-6 col-md-2",
							children: [/* @__PURE__ */ jsx("label", {
								htmlFor: "owner",
								className: "rt-filter-label",
								children: "Owner"
							}), /* @__PURE__ */ jsxs("select", {
								id: "owner",
								className: "form-select",
								value: form.owner,
								onChange: (event) => change("owner", event.target.value),
								children: [
									/* @__PURE__ */ jsx("option", {
										value: "",
										children: "Anyone"
									}),
									/* @__PURE__ */ jsx("option", {
										value: "users",
										children: "Signed-in users"
									}),
									/* @__PURE__ */ jsx("option", {
										value: "guests",
										children: "Guests"
									})
								]
							})]
						}),
						/* @__PURE__ */ jsx("div", {
							className: "col-md-2",
							children: /* @__PURE__ */ jsx("button", {
								type: "button",
								className: "btn btn-link text-muted w-100",
								onClick: () => {
									const empty = {
										search: "",
										template: "",
										owner: ""
									};
									setForm(empty);
									apply(empty);
								},
								children: "Clear filters"
							})
						})
					]
				})
			}),
			/* @__PURE__ */ jsx("section", {
				className: "rt-card",
				children: /* @__PURE__ */ jsx("div", {
					className: "table-responsive",
					children: /* @__PURE__ */ jsxs("table", {
						className: "table rt-admin-table",
						children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
							/* @__PURE__ */ jsx("th", {
								style: { width: "2.5rem" },
								children: /* @__PURE__ */ jsx("input", {
									type: "checkbox",
									className: "form-check-input",
									checked: allOnPageSelected,
									onChange: togglePage,
									"aria-label": "Select all on this page"
								})
							}),
							/* @__PURE__ */ jsx("th", { children: "Job" }),
							/* @__PURE__ */ jsx("th", { children: "Owner" }),
							/* @__PURE__ */ jsx("th", { children: "Design" }),
							/* @__PURE__ */ jsx("th", { children: "Score" }),
							/* @__PURE__ */ jsx("th", { children: "Created" }),
							/* @__PURE__ */ jsx("th", {})
						] }) }), /* @__PURE__ */ jsxs("tbody", { children: [resumes.data.length === 0 && /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", {
							colSpan: "7",
							className: "text-center text-muted py-5",
							children: "No tailored resumes match these filters."
						}) }), resumes.data.map((resume) => /* @__PURE__ */ jsxs("tr", {
							className: selected.includes(resume.id) ? "table-active" : "",
							children: [
								/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("input", {
									type: "checkbox",
									className: "form-check-input",
									checked: selected.includes(resume.id),
									onChange: () => toggle(resume.id),
									"aria-label": `Select resume ${resume.id}`
								}) }),
								/* @__PURE__ */ jsxs("td", { children: [/* @__PURE__ */ jsx("span", {
									className: "fw-semibold",
									children: resume.job_title || `Resume #${resume.id}`
								}), /* @__PURE__ */ jsx("div", {
									className: "small text-muted text-truncate",
									style: { maxWidth: "16rem" },
									children: resume.original_filename
								})] }),
								/* @__PURE__ */ jsx("td", {
									className: "small",
									children: resume.user ? /* @__PURE__ */ jsx(Link, {
										href: `/admin/users/${resume.user.id}`,
										children: resume.user.name
									}) : /* @__PURE__ */ jsx("span", {
										className: "text-muted",
										children: "Guest"
									})
								}),
								/* @__PURE__ */ jsx("td", {
									className: "small",
									children: resume.template_label
								}),
								/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(ScoreChange, {
									before: resume.original_score,
									after: resume.match_score
								}) }),
								/* @__PURE__ */ jsx("td", {
									className: "small text-muted text-nowrap",
									children: formatDate$6(resume.created_at, true)
								}),
								/* @__PURE__ */ jsxs("td", {
									className: "text-end text-nowrap",
									children: [/* @__PURE__ */ jsx(Link, {
										href: `/tailor/${resume.id}`,
										className: "btn btn-sm rt-btn-soft me-1",
										children: "Open"
									}), /* @__PURE__ */ jsx("a", {
										href: `/download/${resume.id}`,
										className: "btn btn-sm btn-outline-secondary",
										"aria-label": "Download PDF",
										children: /* @__PURE__ */ jsx("i", { className: "bi bi-download" })
									})]
								})
							]
						}, resume.id))] })]
					})
				})
			}),
			/* @__PURE__ */ jsx(Pagination, { paginator: resumes }),
			selected.length > 0 && /* @__PURE__ */ jsxs("div", {
				className: "rt-bulk-bar rt-card p-3 mt-3 d-flex flex-wrap align-items-center gap-2 shadow",
				children: [
					/* @__PURE__ */ jsxs("strong", {
						className: "me-2",
						children: [selected.length, " selected"]
					}),
					/* @__PURE__ */ jsx("select", {
						className: "form-select form-select-sm w-auto",
						value: bulkTemplate,
						onChange: (event) => setBulkTemplate(event.target.value),
						"aria-label": "Design to apply",
						children: templates.map((template) => /* @__PURE__ */ jsx("option", {
							value: template.value,
							children: template.label
						}, template.value))
					}),
					/* @__PURE__ */ jsxs("button", {
						type: "button",
						className: "btn btn-sm rt-btn-primary px-3 py-1",
						disabled: isWorking,
						onClick: () => runBulk("template"),
						children: [/* @__PURE__ */ jsx("i", { className: "bi bi-palette me-1" }), "Change design"]
					}),
					/* @__PURE__ */ jsxs("button", {
						type: "button",
						className: "btn btn-sm btn-outline-danger",
						disabled: isWorking,
						onClick: () => runBulk("delete"),
						children: [/* @__PURE__ */ jsx("i", { className: "bi bi-trash me-1" }), "Delete"]
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "btn btn-sm btn-link text-muted ms-auto",
						onClick: () => setSelected([]),
						children: "Clear selection"
					}),
					/* @__PURE__ */ jsxs("small", {
						className: "text-muted w-100",
						children: [
							"Changing the design re-renders the saved resume: text and ATS scores stay the same. Up to ",
							maxBulk,
							" at a time."
						]
					})
				]
			})
		]
	});
}
//#endregion
//#region resources/js/Pages/Admin/Settings.jsx
var Settings_exports = /* @__PURE__ */ __exportAll({ default: () => Settings });
/**
* One field. Secrets are write-only: the current value is never sent to the browser, only a hint
* such as "…a1b2". Leaving a secret empty keeps the saved one.
*/
function Field({ name, field, form }) {
	const error = form.errors[name];
	const id = `setting-${name}`;
	const clearing = (form.data.clear ?? []).includes(name);
	if (field.type === "boolean") return /* @__PURE__ */ jsxs("div", {
		className: "col-12",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "form-check form-switch",
			children: [/* @__PURE__ */ jsx("input", {
				id,
				type: "checkbox",
				role: "switch",
				className: "form-check-input",
				checked: Boolean(form.data[name]),
				onChange: (event) => form.setData(name, event.target.checked)
			}), /* @__PURE__ */ jsx("label", {
				htmlFor: id,
				className: "form-check-label fw-semibold small",
				children: field.label
			})]
		}), field.help && /* @__PURE__ */ jsx("div", {
			className: "form-text ms-5",
			children: field.help
		})]
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "col-md-6",
		children: [
			/* @__PURE__ */ jsxs("label", {
				htmlFor: id,
				className: "form-label fw-semibold small d-flex justify-content-between gap-2",
				children: [/* @__PURE__ */ jsx("span", { children: field.label }), field.type === "secret" && field.is_set && !clearing && /* @__PURE__ */ jsxs("span", {
					className: "badge text-bg-success fw-normal",
					children: ["Saved ", field.hint]
				})]
			}),
			field.type === "select" ? /* @__PURE__ */ jsx("select", {
				id,
				className: `form-select ${error ? "is-invalid" : ""}`,
				value: form.data[name] ?? "",
				onChange: (event) => form.setData(name, event.target.value),
				children: Object.entries(field.options).map(([value, label]) => /* @__PURE__ */ jsx("option", {
					value,
					children: label
				}, value))
			}) : /* @__PURE__ */ jsx("input", {
				id,
				type: field.type === "secret" ? "password" : field.type === "integer" ? "number" : "text",
				autoComplete: field.type === "secret" ? "new-password" : "off",
				className: `form-control ${error ? "is-invalid" : ""}`,
				placeholder: field.type === "secret" && field.is_set ? "Leave empty to keep the saved value" : field.placeholder ?? "",
				value: form.data[name] ?? "",
				disabled: clearing,
				onChange: (event) => form.setData(name, event.target.value)
			}),
			error ? /* @__PURE__ */ jsx("div", {
				className: "invalid-feedback d-block",
				children: error
			}) : field.help && /* @__PURE__ */ jsx("div", {
				className: "form-text",
				children: field.help
			}),
			field.option_help?.[form.data[name]] && /* @__PURE__ */ jsxs("div", {
				className: "rt-setting-hint",
				children: [/* @__PURE__ */ jsx("i", { className: "bi bi-info-circle me-1" }), field.option_help[form.data[name]]]
			}),
			field.type === "secret" && field.is_set && field.hint !== "set in .env" && /* @__PURE__ */ jsxs("div", {
				className: "form-check mt-1",
				children: [/* @__PURE__ */ jsx("input", {
					id: `${id}-clear`,
					type: "checkbox",
					className: "form-check-input",
					checked: clearing,
					onChange: (event) => form.setData("clear", event.target.checked ? [...form.data.clear ?? [], name] : (form.data.clear ?? []).filter((item) => item !== name))
				}), /* @__PURE__ */ jsx("label", {
					htmlFor: `${id}-clear`,
					className: "form-check-label small text-danger",
					children: "Remove the saved value"
				})]
			})
		]
	});
}
function GroupForm({ group, groupKey, extra }) {
	const initial = Object.fromEntries(Object.entries(group.fields).map(([name, field]) => [name, field.type === "secret" ? "" : field.value ?? ""]));
	const form = useForm({
		...initial,
		clear: []
	});
	const submit = (event) => {
		event.preventDefault();
		form.put(`/admin/settings/${groupKey}`, {
			preserveScroll: true,
			onSuccess: () => form.setData((data) => ({
				...data,
				...Object.fromEntries(Object.entries(group.fields).filter(([, field]) => field.type === "secret").map(([name]) => [name, ""])),
				clear: []
			}))
		});
	};
	return /* @__PURE__ */ jsxs("form", {
		className: "rt-card p-3 p-lg-4",
		onSubmit: submit,
		noValidate: true,
		autoComplete: "off",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "d-flex align-items-start gap-3 mb-4",
				children: [/* @__PURE__ */ jsx("span", {
					className: "rt-stat-icon rt-tone-indigo",
					children: /* @__PURE__ */ jsx("i", { className: `bi ${group.icon}` })
				}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
					className: "rt-card-title mb-1",
					children: group.label
				}), /* @__PURE__ */ jsx("p", {
					className: "text-muted small mb-0",
					children: group.description
				})] })]
			}),
			extra,
			/* @__PURE__ */ jsx("div", {
				className: "row g-3",
				children: Object.entries(group.fields).filter(([, field]) => !field.show_when || Object.entries(field.show_when).every(([key, values]) => values.includes(form.data[key]))).map(([name, field]) => /* @__PURE__ */ jsx(Field, {
					name,
					field,
					form
				}, name))
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "d-flex flex-wrap align-items-center gap-2 mt-4 pt-3 border-top",
				children: [/* @__PURE__ */ jsx("button", {
					type: "submit",
					className: "btn rt-btn-primary px-4 py-2",
					disabled: form.processing,
					children: form.processing ? "Saving..." : `Save ${group.label}`
				}), /* @__PURE__ */ jsxs("small", {
					className: "text-muted",
					children: [/* @__PURE__ */ jsx("i", { className: "bi bi-shield-lock me-1" }), "Secrets are encrypted and never shown again after saving."]
				})]
			})
		]
	});
}
function Settings({ groups, tab, webhookUrl, seo }) {
	const { errors } = usePage().props;
	const [active, setActive] = useState(tab);
	const [isTesting, setIsTesting] = useState(null);
	const runTest = (kind) => {
		setIsTesting(kind);
		router.post(`/admin/settings/${kind}/test`, {}, {
			preserveScroll: true,
			preserveState: true,
			onFinish: () => setIsTesting(null)
		});
	};
	const extras = {
		stripe: /* @__PURE__ */ jsxs("div", {
			className: "alert alert-light border small mb-4",
			children: [
				/* @__PURE__ */ jsx("div", {
					className: "fw-semibold mb-1",
					children: "Webhook"
				}),
				"In Stripe → Developers → Webhooks, add ",
				/* @__PURE__ */ jsx("code", { children: webhookUrl }),
				" with the events ",
				/* @__PURE__ */ jsx("code", { children: "customer.subscription.*" }),
				",",
				/* @__PURE__ */ jsx("code", { children: " customer.updated" }),
				", ",
				/* @__PURE__ */ jsx("code", { children: "customer.deleted" }),
				", ",
				/* @__PURE__ */ jsx("code", { children: "invoice.payment_succeeded" }),
				" and ",
				/* @__PURE__ */ jsx("code", { children: "invoice.payment_action_required" }),
				", then paste its signing secret below.",
				/* @__PURE__ */ jsxs("div", {
					className: "mt-2 d-flex flex-wrap align-items-center gap-2",
					children: [/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "btn btn-sm btn-light border",
						onClick: () => runTest("stripe"),
						disabled: isTesting !== null,
						children: isTesting === "stripe" ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("span", {
							className: "spinner-border spinner-border-sm me-1",
							"aria-hidden": "true"
						}), "Checking..."] }) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("i", { className: "bi bi-plug me-1" }), "Test Stripe connection"] })
					}), /* @__PURE__ */ jsx("span", {
						className: "text-muted",
						children: "Save your changes first."
					})]
				}),
				errors.stripe_test && /* @__PURE__ */ jsx("div", {
					className: "text-danger mt-2",
					children: errors.stripe_test
				})
			]
		}),
		mail: /* @__PURE__ */ jsxs("div", {
			className: "alert alert-light border small mb-4 d-flex flex-wrap align-items-center gap-2",
			children: [
				/* @__PURE__ */ jsx("button", {
					type: "button",
					className: "btn btn-sm btn-light border",
					onClick: () => runTest("mail"),
					disabled: isTesting !== null,
					children: isTesting === "mail" ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("span", {
						className: "spinner-border spinner-border-sm me-1",
						"aria-hidden": "true"
					}), "Sending..."] }) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("i", { className: "bi bi-send me-1" }), "Send a test email to me"] })
				}),
				/* @__PURE__ */ jsx("span", {
					className: "text-muted",
					children: "Uses the saved settings, so save first."
				}),
				errors.mail_test && /* @__PURE__ */ jsx("div", {
					className: "text-danger w-100",
					children: errors.mail_test
				})
			]
		}),
		jobs: /* @__PURE__ */ jsxs("div", {
			className: "alert alert-light border small mb-4",
			children: [
				"Search terms, location and auto-sync are on the ",
				/* @__PURE__ */ jsx(Link, {
					href: "/admin/jobs",
					children: "Job feeds"
				}),
				" page. AdSense has its own ",
				/* @__PURE__ */ jsx(Link, {
					href: "/admin/adsense",
					children: "AdSense"
				}),
				" page, and AI keys are under ",
				/* @__PURE__ */ jsx(Link, {
					href: "/admin/ai-keys",
					children: "AI keys"
				}),
				"."
			]
		})
	};
	return /* @__PURE__ */ jsx(AdminLayout, {
		title: "Settings",
		subtitle: "Configure the site here instead of the .env file. Saved values take effect immediately.",
		seo,
		children: /* @__PURE__ */ jsxs("div", {
			className: "row g-4",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "col-lg-3",
				children: [/* @__PURE__ */ jsx("nav", {
					className: "rt-card p-2 rt-settings-nav",
					"aria-label": "Settings sections",
					children: Object.entries(groups).map(([key, group]) => /* @__PURE__ */ jsxs("button", {
						type: "button",
						className: `rt-settings-tab ${active === key ? "is-active" : ""}`,
						onClick: () => setActive(key),
						children: [/* @__PURE__ */ jsx("i", { className: `bi ${group.icon}` }), group.label]
					}, key))
				}), /* @__PURE__ */ jsx("p", {
					className: "small text-muted mt-3 px-1",
					children: "Database, APP_KEY and APP_URL stay in .env: the site needs them before it can read these settings."
				})]
			}), /* @__PURE__ */ jsx("div", {
				className: "col-lg-9",
				children: Object.entries(groups).map(([key, group]) => /* @__PURE__ */ jsx("div", {
					hidden: active !== key,
					children: /* @__PURE__ */ jsx(GroupForm, {
						group,
						groupKey: key,
						extra: extras[key] ?? null
					})
				}, key))
			})]
		})
	});
}
//#endregion
//#region resources/js/Pages/Admin/Users/Index.jsx
var Index_exports$5 = /* @__PURE__ */ __exportAll({ default: () => UsersIndex });
function UsersIndex({ users, filters, roles, seo }) {
	const [form, setForm] = useState({
		search: filters.search ?? "",
		role: filters.role ?? "",
		status: filters.status ?? "",
		plan: filters.plan ?? ""
	});
	const apply = (next) => {
		const query = Object.fromEntries(Object.entries(next).filter(([, value]) => value !== ""));
		router.get("/admin/users", query, {
			preserveState: true,
			preserveScroll: true,
			replace: true
		});
	};
	const change = (field, value) => {
		const next = {
			...form,
			[field]: value
		};
		setForm(next);
		if (field !== "search") apply(next);
	};
	return /* @__PURE__ */ jsxs(AdminLayout, {
		title: "Users",
		subtitle: `${users.total.toLocaleString()} account${users.total === 1 ? "" : "s"}`,
		seo,
		children: [
			/* @__PURE__ */ jsx("form", {
				className: "rt-card p-3 mb-3",
				onSubmit: (event) => {
					event.preventDefault();
					apply(form);
				},
				children: /* @__PURE__ */ jsxs("div", {
					className: "row g-2 align-items-end",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "col-md-4",
							children: [/* @__PURE__ */ jsx("label", {
								htmlFor: "search",
								className: "rt-filter-label",
								children: "Search"
							}), /* @__PURE__ */ jsxs("div", {
								className: "input-group",
								children: [/* @__PURE__ */ jsx("input", {
									id: "search",
									type: "search",
									className: "form-control rt-input",
									placeholder: "Name or email",
									value: form.search,
									onChange: (event) => change("search", event.target.value)
								}), /* @__PURE__ */ jsx("button", {
									className: "btn rt-btn-soft",
									type: "submit",
									"aria-label": "Search",
									children: /* @__PURE__ */ jsx("i", { className: "bi bi-search" })
								})]
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "col-6 col-md-2",
							children: [/* @__PURE__ */ jsx("label", {
								htmlFor: "role",
								className: "rt-filter-label",
								children: "Role"
							}), /* @__PURE__ */ jsxs("select", {
								id: "role",
								className: "form-select",
								value: form.role,
								onChange: (event) => change("role", event.target.value),
								children: [/* @__PURE__ */ jsx("option", {
									value: "",
									children: "Any"
								}), roles.map((role) => /* @__PURE__ */ jsx("option", {
									value: role.value,
									children: role.label
								}, role.value))]
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "col-6 col-md-2",
							children: [/* @__PURE__ */ jsx("label", {
								htmlFor: "plan",
								className: "rt-filter-label",
								children: "Plan"
							}), /* @__PURE__ */ jsxs("select", {
								id: "plan",
								className: "form-select",
								value: form.plan,
								onChange: (event) => change("plan", event.target.value),
								children: [
									/* @__PURE__ */ jsx("option", {
										value: "",
										children: "Any"
									}),
									/* @__PURE__ */ jsx("option", {
										value: "free",
										children: "Free"
									}),
									/* @__PURE__ */ jsx("option", {
										value: "pro",
										children: "Pro"
									})
								]
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "col-6 col-md-2",
							children: [/* @__PURE__ */ jsx("label", {
								htmlFor: "status",
								className: "rt-filter-label",
								children: "Status"
							}), /* @__PURE__ */ jsxs("select", {
								id: "status",
								className: "form-select",
								value: form.status,
								onChange: (event) => change("status", event.target.value),
								children: [
									/* @__PURE__ */ jsx("option", {
										value: "",
										children: "Any"
									}),
									/* @__PURE__ */ jsx("option", {
										value: "active",
										children: "Active"
									}),
									/* @__PURE__ */ jsx("option", {
										value: "suspended",
										children: "Suspended"
									}),
									/* @__PURE__ */ jsx("option", {
										value: "unverified",
										children: "Email not verified"
									})
								]
							})]
						}),
						/* @__PURE__ */ jsx("div", {
							className: "col-6 col-md-2",
							children: /* @__PURE__ */ jsx("button", {
								type: "button",
								className: "btn btn-link text-muted w-100",
								onClick: () => {
									const empty = {
										search: "",
										role: "",
										status: "",
										plan: ""
									};
									setForm(empty);
									apply(empty);
								},
								children: "Clear filters"
							})
						})
					]
				})
			}),
			/* @__PURE__ */ jsx("section", {
				className: "rt-card",
				children: /* @__PURE__ */ jsx("div", {
					className: "table-responsive",
					children: /* @__PURE__ */ jsxs("table", {
						className: "table rt-admin-table",
						children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
							/* @__PURE__ */ jsx("th", { children: "User" }),
							/* @__PURE__ */ jsx("th", { children: "Role" }),
							/* @__PURE__ */ jsx("th", { children: "Plan" }),
							/* @__PURE__ */ jsx("th", {
								className: "text-center",
								children: "Tailored"
							}),
							/* @__PURE__ */ jsx("th", {
								className: "text-center",
								children: "Uploaded CVs"
							}),
							/* @__PURE__ */ jsx("th", { children: "Joined" }),
							/* @__PURE__ */ jsx("th", {})
						] }) }), /* @__PURE__ */ jsxs("tbody", { children: [users.data.length === 0 && /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", {
							colSpan: "7",
							className: "text-center text-muted py-5",
							children: "No users match these filters."
						}) }), users.data.map((user) => /* @__PURE__ */ jsxs("tr", { children: [
							/* @__PURE__ */ jsxs("td", { children: [
								/* @__PURE__ */ jsx(Link, {
									href: `/admin/users/${user.id}`,
									className: "fw-semibold text-decoration-none",
									children: user.name
								}),
								/* @__PURE__ */ jsx("div", {
									className: "small text-muted",
									children: user.email
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "d-flex gap-1 mt-1",
									children: [user.suspended && /* @__PURE__ */ jsx("span", {
										className: "badge text-bg-danger",
										children: "Suspended"
									}), !user.email_verified && /* @__PURE__ */ jsx("span", {
										className: "badge text-bg-warning",
										children: "Unverified"
									})]
								})
							] }),
							/* @__PURE__ */ jsx("td", {
								className: "small",
								children: user.role_label
							}),
							/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(PlanBadge, {
								plan: user.plan,
								complimentary: user.complimentary_pro
							}) }),
							/* @__PURE__ */ jsx("td", {
								className: "text-center",
								children: user.tailored_resumes_count
							}),
							/* @__PURE__ */ jsx("td", {
								className: "text-center",
								children: user.resumes_count
							}),
							/* @__PURE__ */ jsx("td", {
								className: "small text-muted text-nowrap",
								children: formatDate$6(user.created_at)
							}),
							/* @__PURE__ */ jsx("td", {
								className: "text-end",
								children: /* @__PURE__ */ jsx(Link, {
									href: `/admin/users/${user.id}`,
									className: "btn btn-sm rt-btn-soft",
									children: "Manage"
								})
							})
						] }, user.id))] })]
					})
				})
			}),
			/* @__PURE__ */ jsx(Pagination, { paginator: users })
		]
	});
}
//#endregion
//#region resources/js/Pages/Admin/Users/Show.jsx
var Show_exports$2 = /* @__PURE__ */ __exportAll({ default: () => UserShow });
function EditUserForm({ user, roles, permissions }) {
	const form = useForm({
		name: user.name,
		email: user.email,
		role: user.role,
		email_verified: user.email_verified
	});
	const canEditRole = permissions.manage_roles && !permissions.is_self && !user.is_configured_admin;
	const submit = (event) => {
		event.preventDefault();
		form.patch(`/admin/users/${user.id}`, { preserveScroll: true });
	};
	return /* @__PURE__ */ jsxs("form", {
		onSubmit: submit,
		noValidate: true,
		children: [/* @__PURE__ */ jsxs("div", {
			className: "row g-3",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "col-md-6",
					children: [
						/* @__PURE__ */ jsx("label", {
							htmlFor: "name",
							className: "form-label fw-semibold small",
							children: "Name"
						}),
						/* @__PURE__ */ jsx("input", {
							id: "name",
							className: `form-control ${form.errors.name ? "is-invalid" : ""}`,
							value: form.data.name,
							onChange: (event) => form.setData("name", event.target.value),
							disabled: !permissions.manage
						}),
						form.errors.name && /* @__PURE__ */ jsx("div", {
							className: "invalid-feedback",
							children: form.errors.name
						})
					]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "col-md-6",
					children: [
						/* @__PURE__ */ jsx("label", {
							htmlFor: "email",
							className: "form-label fw-semibold small",
							children: "Email"
						}),
						/* @__PURE__ */ jsx("input", {
							id: "email",
							type: "email",
							className: `form-control ${form.errors.email ? "is-invalid" : ""}`,
							value: form.data.email,
							onChange: (event) => form.setData("email", event.target.value),
							disabled: !permissions.manage
						}),
						form.errors.email && /* @__PURE__ */ jsx("div", {
							className: "invalid-feedback",
							children: form.errors.email
						})
					]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "col-md-6",
					children: [
						/* @__PURE__ */ jsx("label", {
							htmlFor: "role",
							className: "form-label fw-semibold small",
							children: "Role"
						}),
						/* @__PURE__ */ jsx("select", {
							id: "role",
							className: `form-select ${form.errors.role ? "is-invalid" : ""}`,
							value: form.data.role,
							onChange: (event) => form.setData("role", event.target.value),
							disabled: !permissions.manage || !canEditRole,
							children: roles.map((role) => /* @__PURE__ */ jsx("option", {
								value: role.value,
								children: role.label
							}, role.value))
						}),
						form.errors.role && /* @__PURE__ */ jsx("div", {
							className: "invalid-feedback",
							children: form.errors.role
						}),
						!canEditRole && /* @__PURE__ */ jsx("div", {
							className: "form-text",
							children: user.is_configured_admin ? "Set by JOB_ADMIN_EMAILS in .env." : permissions.is_self ? "You cannot change your own role." : "Only super admins can change roles."
						})
					]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "col-md-6 d-flex align-items-end",
					children: /* @__PURE__ */ jsxs("div", {
						className: "form-check form-switch mb-2",
						children: [/* @__PURE__ */ jsx("input", {
							id: "email_verified",
							className: "form-check-input",
							type: "checkbox",
							role: "switch",
							checked: form.data.email_verified,
							onChange: (event) => form.setData("email_verified", event.target.checked),
							disabled: !permissions.manage
						}), /* @__PURE__ */ jsx("label", {
							htmlFor: "email_verified",
							className: "form-check-label small",
							children: "Email verified"
						})]
					})
				})
			]
		}), permissions.manage && /* @__PURE__ */ jsx("button", {
			type: "submit",
			className: "btn rt-btn-primary px-4 py-2 mt-3",
			disabled: form.processing || !form.isDirty,
			children: form.processing ? "Saving..." : "Save changes"
		})]
	});
}
function UserShow({ user, billing, subscription, aiUsageToday, counts, uploadedResumes, tailoredResumes, permissions, roles, proMonths, seo }) {
	const [months, setMonths] = useState(proMonths.find((value) => value > 0) ?? 1);
	const canManage = permissions.manage && !permissions.is_self;
	const post = (method, url, data = {}, confirmMessage = null) => {
		if (confirmMessage && !window.confirm(confirmMessage)) return;
		router[method](url, data, { preserveScroll: true });
	};
	return /* @__PURE__ */ jsxs(AdminLayout, {
		title: user.name,
		subtitle: `${user.email} · joined ${formatDate$6(user.created_at)}`,
		seo,
		actions: /* @__PURE__ */ jsxs(Fragment, { children: [
			/* @__PURE__ */ jsxs(Link, {
				href: "/admin/users",
				className: "btn rt-btn-soft",
				children: [/* @__PURE__ */ jsx("i", { className: "bi bi-arrow-left me-1" }), "All users"]
			}),
			canManage && (user.suspended ? /* @__PURE__ */ jsxs("button", {
				type: "button",
				className: "btn btn-outline-success",
				onClick: () => post("delete", `/admin/users/${user.id}/suspend`),
				children: [/* @__PURE__ */ jsx("i", { className: "bi bi-unlock me-1" }), "Unsuspend"]
			}) : /* @__PURE__ */ jsxs("button", {
				type: "button",
				className: "btn btn-outline-warning",
				onClick: () => post("post", `/admin/users/${user.id}/suspend`, {}, `Suspend ${user.name}? They will be signed out and cannot sign in until unsuspended.`),
				children: [/* @__PURE__ */ jsx("i", { className: "bi bi-slash-circle me-1" }), "Suspend"]
			})),
			canManage && /* @__PURE__ */ jsxs("button", {
				type: "button",
				className: "btn btn-outline-danger",
				onClick: () => post("delete", `/admin/users/${user.id}`, {}, `Delete ${user.name} and all their data permanently? This cannot be undone.`),
				children: [/* @__PURE__ */ jsx("i", { className: "bi bi-trash me-1" }), "Delete"]
			})
		] }),
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "d-flex flex-wrap gap-2 mb-4",
				children: [
					/* @__PURE__ */ jsx(PlanBadge, {
						plan: billing.plan,
						complimentary: user.complimentary_pro
					}),
					/* @__PURE__ */ jsx("span", {
						className: "badge text-bg-light border",
						children: user.role_label
					}),
					user.suspended && /* @__PURE__ */ jsx("span", {
						className: "badge text-bg-danger",
						children: "Suspended"
					}),
					!user.email_verified && /* @__PURE__ */ jsx("span", {
						className: "badge text-bg-warning",
						children: "Email not verified"
					}),
					!permissions.manage && /* @__PURE__ */ jsx("span", {
						className: "badge text-bg-secondary",
						children: "View only: you cannot manage this account"
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "row g-3 mb-4",
				children: [
					/* @__PURE__ */ jsx("div", {
						className: "col-6 col-xl-3",
						children: /* @__PURE__ */ jsx(StatCard, {
							icon: "bi-file-earmark-check",
							tone: "green",
							label: "Tailored this month",
							value: billing.limit > 0 ? `${billing.used} / ${billing.limit}` : formatNumber(billing.used),
							hint: `Resets ${formatDate$6(billing.resets_at)}`
						})
					}),
					/* @__PURE__ */ jsx("div", {
						className: "col-6 col-xl-3",
						children: /* @__PURE__ */ jsx(StatCard, {
							icon: "bi-archive",
							tone: "indigo",
							label: "Tailored all time",
							value: formatNumber(counts.tailored_resumes),
							hint: `${uploadedResumes.length} uploaded CV${uploadedResumes.length === 1 ? "" : "s"}`
						})
					}),
					/* @__PURE__ */ jsx("div", {
						className: "col-6 col-xl-3",
						children: /* @__PURE__ */ jsx(StatCard, {
							icon: "bi-cpu",
							tone: "amber",
							label: "AI today",
							value: formatNumber(aiUsageToday.requests),
							hint: `${formatNumber(aiUsageToday.tokens)} tokens`
						})
					}),
					/* @__PURE__ */ jsx("div", {
						className: "col-6 col-xl-3",
						children: /* @__PURE__ */ jsx(StatCard, {
							icon: "bi-briefcase",
							tone: "sky",
							label: "Job tracking",
							value: formatNumber(counts.saved_jobs),
							hint: `saved jobs · ${counts.saved_searches} searches`
						})
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "row g-4 mb-4",
				children: [/* @__PURE__ */ jsx("div", {
					className: "col-xl-7",
					children: /* @__PURE__ */ jsxs("section", {
						className: "rt-card p-3 p-lg-4 h-100",
						children: [/* @__PURE__ */ jsxs("h2", {
							className: "rt-card-title mb-3",
							children: [/* @__PURE__ */ jsx("i", { className: "bi bi-person-gear" }), "Account"]
						}), /* @__PURE__ */ jsx(EditUserForm, {
							user,
							roles,
							permissions
						}, user.id)]
					})
				}), /* @__PURE__ */ jsx("div", {
					className: "col-xl-5",
					children: /* @__PURE__ */ jsxs("section", {
						className: "rt-card p-3 p-lg-4 h-100",
						children: [
							/* @__PURE__ */ jsxs("h2", {
								className: "rt-card-title mb-3",
								children: [/* @__PURE__ */ jsx("i", { className: "bi bi-credit-card" }), "Plan & billing"]
							}),
							/* @__PURE__ */ jsxs("dl", {
								className: "row small mb-3",
								children: [
									/* @__PURE__ */ jsx("dt", {
										className: "col-5 text-muted fw-normal",
										children: "Stripe subscription"
									}),
									/* @__PURE__ */ jsx("dd", {
										className: "col-7",
										children: subscription ? `${subscription.status}${subscription.ends_at ? `, ends ${formatDate$6(subscription.ends_at)}` : ""}` : "None"
									}),
									/* @__PURE__ */ jsx("dt", {
										className: "col-5 text-muted fw-normal",
										children: "Gifted Pro"
									}),
									/* @__PURE__ */ jsx("dd", {
										className: "col-7",
										children: user.complimentary_pro ? `Until ${formatDate$6(user.pro_until)}` : "None"
									}),
									/* @__PURE__ */ jsx("dt", {
										className: "col-5 text-muted fw-normal",
										children: "Stripe customer"
									}),
									/* @__PURE__ */ jsx("dd", {
										className: "col-7",
										children: user.has_stripe_account ? "Yes" : "No"
									})
								]
							}),
							permissions.manage && /* @__PURE__ */ jsxs("div", {
								className: "d-flex flex-wrap gap-2 align-items-center",
								children: [
									/* @__PURE__ */ jsx("select", {
										className: "form-select form-select-sm w-auto",
										value: months,
										onChange: (event) => setMonths(Number(event.target.value)),
										"aria-label": "Months of Pro",
										children: proMonths.filter((value) => value > 0).map((value) => /* @__PURE__ */ jsxs("option", {
											value,
											children: [
												value,
												" month",
												value === 1 ? "" : "s"
											]
										}, value))
									}),
									/* @__PURE__ */ jsxs("button", {
										type: "button",
										className: "btn btn-sm rt-btn-primary px-3 py-1",
										onClick: () => post("post", `/admin/users/${user.id}/pro`, { months }),
										children: [/* @__PURE__ */ jsx("i", { className: "bi bi-gift me-1" }), "Give Pro"]
									}),
									user.complimentary_pro && /* @__PURE__ */ jsx("button", {
										type: "button",
										className: "btn btn-sm btn-link text-danger",
										onClick: () => post("post", `/admin/users/${user.id}/pro`, { months: 0 }, "Remove the gifted Pro?"),
										children: "Remove gift"
									})
								]
							}),
							/* @__PURE__ */ jsx("p", {
								className: "small text-muted mt-3 mb-0",
								children: "Gifted Pro needs no payment and does not touch Stripe. Paid subscriptions are managed in the Stripe dashboard."
							})
						]
					})
				})]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "rt-card mb-4",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "d-flex justify-content-between align-items-center p-3 p-lg-4 pb-2",
					children: [/* @__PURE__ */ jsxs("h2", {
						className: "rt-card-title",
						children: [/* @__PURE__ */ jsx("i", { className: "bi bi-file-earmark-check" }), "Tailored resumes"]
					}), counts.tailored_resumes > tailoredResumes.length && /* @__PURE__ */ jsxs(Link, {
						href: `/admin/resumes?user=${user.id}`,
						className: "small",
						children: ["See all ", counts.tailored_resumes]
					})]
				}), /* @__PURE__ */ jsx("div", {
					className: "table-responsive",
					children: /* @__PURE__ */ jsxs("table", {
						className: "table rt-admin-table",
						children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
							/* @__PURE__ */ jsx("th", { children: "Job" }),
							/* @__PURE__ */ jsx("th", { children: "Design" }),
							/* @__PURE__ */ jsx("th", { children: "Score" }),
							/* @__PURE__ */ jsx("th", { children: "Created" }),
							/* @__PURE__ */ jsx("th", {})
						] }) }), /* @__PURE__ */ jsxs("tbody", { children: [tailoredResumes.length === 0 && /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", {
							colSpan: "5",
							className: "text-center text-muted py-4",
							children: "No tailored resumes yet."
						}) }), tailoredResumes.map((resume) => /* @__PURE__ */ jsxs("tr", { children: [
							/* @__PURE__ */ jsx("td", {
								className: "fw-semibold",
								children: resume.job_title || `Resume #${resume.id}`
							}),
							/* @__PURE__ */ jsx("td", {
								className: "small",
								children: resume.template
							}),
							/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(ScoreChange, {
								before: resume.original_score,
								after: resume.match_score
							}) }),
							/* @__PURE__ */ jsx("td", {
								className: "small text-muted text-nowrap",
								children: formatDate$6(resume.created_at, true)
							}),
							/* @__PURE__ */ jsxs("td", {
								className: "text-end text-nowrap",
								children: [/* @__PURE__ */ jsx(Link, {
									href: `/tailor/${resume.id}`,
									className: "btn btn-sm rt-btn-soft me-1",
									children: "Open"
								}), /* @__PURE__ */ jsx("a", {
									href: `/download/${resume.id}`,
									className: "btn btn-sm btn-outline-secondary",
									"aria-label": "Download PDF",
									children: /* @__PURE__ */ jsx("i", { className: "bi bi-download" })
								})]
							})
						] }, resume.id))] })]
					})
				})]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "rt-card p-3 p-lg-4",
				children: [
					/* @__PURE__ */ jsxs("h2", {
						className: "rt-card-title mb-3",
						children: [/* @__PURE__ */ jsx("i", { className: "bi bi-upload" }), "Uploaded CVs"]
					}),
					uploadedResumes.length === 0 && /* @__PURE__ */ jsx("p", {
						className: "text-muted small mb-0",
						children: "No CVs uploaded."
					}),
					/* @__PURE__ */ jsx("div", {
						className: "d-grid gap-2",
						children: uploadedResumes.map((resume) => /* @__PURE__ */ jsxs("details", {
							className: "border rounded-3 p-3",
							children: [/* @__PURE__ */ jsxs("summary", {
								className: "d-flex flex-wrap justify-content-between align-items-center gap-2",
								style: { cursor: "pointer" },
								children: [/* @__PURE__ */ jsxs("span", { children: [
									/* @__PURE__ */ jsx("i", { className: "bi bi-file-earmark-text me-2 text-muted" }),
									/* @__PURE__ */ jsx("strong", { children: resume.original_filename }),
									resume.is_primary && /* @__PURE__ */ jsx("span", {
										className: "badge text-bg-primary ms-2",
										children: "Primary"
									}),
									/* @__PURE__ */ jsxs("span", {
										className: "small text-muted ms-2",
										children: [
											formatNumber(resume.characters),
											" characters · ",
											formatDate$6(resume.created_at)
										]
									})
								] }), permissions.manage && /* @__PURE__ */ jsx("button", {
									type: "button",
									className: "btn btn-sm btn-outline-danger",
									onClick: (event) => {
										event.preventDefault();
										post("delete", `/admin/users/${user.id}/resumes/${resume.id}`, {}, `Delete ${resume.original_filename}?`);
									},
									children: /* @__PURE__ */ jsx("i", { className: "bi bi-trash" })
								})]
							}), /* @__PURE__ */ jsxs("pre", {
								className: "rt-plain mt-3 mb-0",
								style: { maxHeight: "18rem" },
								children: [resume.preview, resume.characters > resume.preview.length ? "\n…" : ""]
							})]
						}, resume.id))
					})
				]
			})
		]
	});
}
//#endregion
//#region resources/js/Components/NavBar.jsx
var PRIMARY_LINKS = [
	{
		href: "/",
		label: "Tailor a resume",
		icon: "bi-magic",
		exact: true
	},
	{
		href: "/jobs",
		label: "Job matches",
		icon: "bi-briefcase"
	},
	{
		href: "/blog",
		label: "Guides",
		icon: "bi-journal-text"
	},
	{
		href: "/pricing",
		label: "Pricing",
		icon: "bi-tag"
	}
];
var ACCOUNT_LINKS = [
	{
		href: "/resumes",
		label: "My resumes",
		icon: "bi-file-earmark-person"
	},
	{
		href: "/saved-jobs",
		label: "Saved jobs",
		icon: "bi-bookmark-star"
	},
	{
		href: "/saved-searches",
		label: "Saved searches",
		icon: "bi-bell"
	},
	{
		href: "/profile",
		label: "Profile & billing",
		icon: "bi-person-gear"
	}
];
var initials = (name = "") => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("") || "U";
/**
* The site navbar, the same on every page: brand on the left, the main sections in the middle, then
* the account (or log in / sign up) and, last, the plan badge. Collapses into a menu below 992px.
*/
function NavBar() {
	const { auth, billing } = usePage().props;
	const url = usePage().url.split("?")[0];
	const user = auth?.user;
	const isPro = billing?.plan === "pro";
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isAccountOpen, setIsAccountOpen] = useState(false);
	const accountRef = useRef(null);
	useEffect(() => {
		setIsMenuOpen(false);
		setIsAccountOpen(false);
	}, [url]);
	useEffect(() => {
		if (!isAccountOpen) return;
		const close = (event) => {
			if (event.type === "keydown" ? event.key === "Escape" : !accountRef.current?.contains(event.target)) setIsAccountOpen(false);
		};
		document.addEventListener("mousedown", close);
		document.addEventListener("keydown", close);
		return () => {
			document.removeEventListener("mousedown", close);
			document.removeEventListener("keydown", close);
		};
	}, [isAccountOpen]);
	const isActive = (link) => link.exact ? url === link.href : url === link.href || url.startsWith(`${link.href}/`);
	const planBadge = user && (isPro ? /* @__PURE__ */ jsxs(Link, {
		href: "/pricing",
		className: "rt-plan-pill",
		title: "You are on Pro",
		children: [/* @__PURE__ */ jsx("i", { className: "bi bi-stars" }), "Pro"]
	}) : /* @__PURE__ */ jsxs(Link, {
		href: "/pricing",
		className: "rt-nav-upgrade",
		children: [/* @__PURE__ */ jsx("i", { className: "bi bi-lightning-charge-fill" }), "Upgrade"]
	}));
	return /* @__PURE__ */ jsxs("nav", {
		className: "rt-nav",
		"aria-label": "Main",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "container rt-nav-bar",
			children: [
				/* @__PURE__ */ jsxs(Link, {
					href: "/",
					className: "rt-brand",
					children: [/* @__PURE__ */ jsx("span", {
						className: "rt-brand-mark",
						children: /* @__PURE__ */ jsx("i", { className: "bi bi-file-earmark-check" })
					}), /* @__PURE__ */ jsxs("span", { children: ["ResumeTailor", /* @__PURE__ */ jsx("span", {
						className: "rt-brand-ai",
						children: "AI"
					})] })]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "rt-nav-primary d-none d-lg-flex",
					children: PRIMARY_LINKS.map((link) => /* @__PURE__ */ jsx(Link, {
						href: link.href,
						className: `rt-nav-link ${isActive(link) ? "is-active" : ""}`,
						"aria-current": isActive(link) ? "page" : void 0,
						children: link.label
					}, link.href))
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "rt-nav-actions d-none d-lg-flex",
					children: [user ? /* @__PURE__ */ jsxs("div", {
						className: "position-relative",
						ref: accountRef,
						children: [/* @__PURE__ */ jsxs("button", {
							type: "button",
							className: `rt-account-toggle ${isAccountOpen ? "is-open" : ""}`,
							"aria-haspopup": "menu",
							"aria-expanded": isAccountOpen,
							onClick: () => setIsAccountOpen((open) => !open),
							children: [
								/* @__PURE__ */ jsx("span", {
									className: "rt-account-avatar",
									children: initials(user.name)
								}),
								/* @__PURE__ */ jsx("span", {
									className: "rt-account-name",
									children: user.name
								}),
								/* @__PURE__ */ jsx("i", { className: "bi bi-chevron-down small" })
							]
						}), isAccountOpen && /* @__PURE__ */ jsxs("div", {
							className: "rt-account-menu",
							role: "menu",
							children: [
								/* @__PURE__ */ jsxs("div", {
									className: "rt-account-head",
									children: [/* @__PURE__ */ jsx("div", {
										className: "fw-semibold text-truncate",
										children: user.name
									}), /* @__PURE__ */ jsx("div", {
										className: "small text-muted text-truncate",
										children: user.email
									})]
								}),
								ACCOUNT_LINKS.map((link) => /* @__PURE__ */ jsxs(Link, {
									href: link.href,
									className: "rt-account-item",
									role: "menuitem",
									children: [/* @__PURE__ */ jsx("i", { className: `bi ${link.icon}` }), link.label]
								}, link.href)),
								user.is_admin && /* @__PURE__ */ jsxs(Link, {
									href: "/admin",
									className: "rt-account-item",
									role: "menuitem",
									children: [/* @__PURE__ */ jsx("i", { className: "bi bi-shield-lock" }), "Admin console"]
								}),
								/* @__PURE__ */ jsx("div", { className: "rt-account-divider" }),
								/* @__PURE__ */ jsxs(Link, {
									href: "/logout",
									method: "post",
									as: "button",
									className: "rt-account-item is-danger",
									role: "menuitem",
									children: [/* @__PURE__ */ jsx("i", { className: "bi bi-box-arrow-right" }), "Log out"]
								})
							]
						})]
					}) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Link, {
						href: "/login",
						className: "rt-nav-link",
						children: "Log in"
					}), /* @__PURE__ */ jsx(Link, {
						href: "/register",
						className: "btn rt-btn-primary rt-nav-cta",
						children: "Sign up free"
					})] }), planBadge]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "d-flex d-lg-none align-items-center gap-2 ms-auto",
					children: [planBadge, /* @__PURE__ */ jsx("button", {
						type: "button",
						className: "rt-nav-burger",
						"aria-label": isMenuOpen ? "Close menu" : "Open menu",
						"aria-expanded": isMenuOpen,
						onClick: () => setIsMenuOpen((open) => !open),
						children: /* @__PURE__ */ jsx("i", { className: `bi ${isMenuOpen ? "bi-x-lg" : "bi-list"}` })
					})]
				})
			]
		}), isMenuOpen && /* @__PURE__ */ jsx("div", {
			className: "rt-nav-menu d-lg-none",
			children: /* @__PURE__ */ jsxs("div", {
				className: "container py-3",
				children: [
					PRIMARY_LINKS.map((link) => /* @__PURE__ */ jsxs(Link, {
						href: link.href,
						className: `rt-mobile-link ${isActive(link) ? "is-active" : ""}`,
						children: [/* @__PURE__ */ jsx("i", { className: `bi ${link.icon}` }), link.label]
					}, link.href)),
					/* @__PURE__ */ jsx("div", { className: "rt-account-divider my-2" }),
					user ? /* @__PURE__ */ jsxs(Fragment, { children: [
						/* @__PURE__ */ jsxs("div", {
							className: "d-flex align-items-center gap-2 px-2 py-2",
							children: [/* @__PURE__ */ jsx("span", {
								className: "rt-account-avatar",
								children: initials(user.name)
							}), /* @__PURE__ */ jsxs("div", {
								className: "min-w-0",
								children: [/* @__PURE__ */ jsx("div", {
									className: "fw-semibold text-truncate",
									children: user.name
								}), /* @__PURE__ */ jsx("div", {
									className: "small text-muted text-truncate",
									children: user.email
								})]
							})]
						}),
						ACCOUNT_LINKS.map((link) => /* @__PURE__ */ jsxs(Link, {
							href: link.href,
							className: `rt-mobile-link ${isActive(link) ? "is-active" : ""}`,
							children: [/* @__PURE__ */ jsx("i", { className: `bi ${link.icon}` }), link.label]
						}, link.href)),
						user.is_admin && /* @__PURE__ */ jsxs(Link, {
							href: "/admin",
							className: "rt-mobile-link",
							children: [/* @__PURE__ */ jsx("i", { className: "bi bi-shield-lock" }), "Admin console"]
						}),
						/* @__PURE__ */ jsxs(Link, {
							href: "/logout",
							method: "post",
							as: "button",
							className: "rt-mobile-link is-danger w-100 text-start",
							children: [/* @__PURE__ */ jsx("i", { className: "bi bi-box-arrow-right" }), "Log out"]
						})
					] }) : /* @__PURE__ */ jsxs("div", {
						className: "d-grid gap-2 pt-1",
						children: [/* @__PURE__ */ jsx(Link, {
							href: "/register",
							className: "btn rt-btn-primary",
							children: "Sign up free"
						}), /* @__PURE__ */ jsx(Link, {
							href: "/login",
							className: "btn btn-light border",
							children: "Log in"
						})]
					})
				]
			})
		})]
	});
}
//#endregion
//#region resources/js/Components/Footer.jsx
/**
* The site footer, shared by every public page through MainLayout. Links only go to pages that exist.
*/
function Footer() {
	const user = usePage().props.auth?.user;
	const year = (/* @__PURE__ */ new Date()).getFullYear();
	return /* @__PURE__ */ jsx("footer", {
		className: "rt-site-footer mt-auto",
		children: /* @__PURE__ */ jsxs("div", {
			className: "container",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "row g-4 g-lg-5 rt-site-footer-top",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "col-lg-4",
						children: [
							/* @__PURE__ */ jsxs(Link, {
								href: "/",
								className: "rt-brand rt-brand-light mb-3",
								children: [/* @__PURE__ */ jsx("span", {
									className: "rt-brand-mark",
									children: /* @__PURE__ */ jsx("i", { className: "bi bi-file-earmark-check" })
								}), /* @__PURE__ */ jsxs("span", { children: ["ResumeTailor", /* @__PURE__ */ jsx("span", {
									className: "rt-brand-ai",
									children: "AI"
								})] })]
							}),
							/* @__PURE__ */ jsx("p", {
								className: "rt-site-footer-lead",
								children: "Score your CV against any job description, tailor it with the job's own keywords and download an ATS-safe resume that applicant tracking systems can read."
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "rt-site-footer-badges",
								children: [
									/* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("i", { className: "bi bi-shield-check" }), "Truthful rewrites"] }),
									/* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("i", { className: "bi bi-file-earmark-check" }), "ATS-safe PDFs"] }),
									/* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("i", { className: "bi bi-lock" }), "Secure payments"] })
								]
							})
						]
					}), [
						{
							title: "Product",
							links: [
								{
									href: "/",
									label: "Tailor a resume"
								},
								{
									href: "/#how-it-works",
									label: "How it works"
								},
								{
									href: "/jobs",
									label: "Job matches"
								},
								{
									href: "/pricing",
									label: "Pricing"
								}
							]
						},
						{
							title: user ? "Your account" : "Get started",
							links: user ? [
								{
									href: "/resumes",
									label: "My resumes"
								},
								{
									href: "/saved-jobs",
									label: "Saved jobs"
								},
								{
									href: "/saved-searches",
									label: "Saved searches"
								},
								{
									href: "/profile",
									label: "Profile & billing"
								}
							] : [
								{
									href: "/register",
									label: "Create a free account"
								},
								{
									href: "/login",
									label: "Log in"
								},
								{
									href: "/pricing",
									label: "Compare plans"
								}
							]
						},
						{
							title: "Company",
							links: [
								{
									href: "/about",
									label: "About us"
								},
								{
									href: "/blog",
									label: "Guides"
								},
								{
									href: "/contact",
									label: "Contact"
								},
								{
									href: "/pricing#faq",
									label: "FAQ"
								}
							]
						},
						{
							title: "Legal",
							links: [{
								href: "/privacy",
								label: "Privacy Policy"
							}, {
								href: "/terms",
								label: "Terms of Service"
							}]
						}
					].map((column) => /* @__PURE__ */ jsxs("div", {
						className: "col-6 col-md-3 col-lg-2",
						children: [/* @__PURE__ */ jsx("h2", {
							className: "rt-site-footer-title",
							children: column.title
						}), /* @__PURE__ */ jsx("ul", {
							className: "list-unstyled mb-0",
							children: column.links.map((link) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
								href: link.href,
								className: "rt-site-footer-link",
								children: link.label
							}) }, `${column.title}-${link.label}`))
						})]
					}, column.title))]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "rt-site-footer-cta",
					children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
						className: "fw-semibold text-white",
						children: "Check your ATS score in seconds"
					}), /* @__PURE__ */ jsx("div", {
						className: "small",
						children: "Free and unlimited. No sign-up needed."
					})] }), /* @__PURE__ */ jsx(Link, {
						href: "/",
						className: "btn rt-btn-primary px-4",
						children: "Check my CV"
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "rt-site-footer-bottom",
					children: [/* @__PURE__ */ jsxs("span", { children: [
						"© ",
						year,
						" ResumeTailor AI. All rights reserved."
					] }), /* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("i", { className: "bi bi-lock-fill me-1" }), "Your CV is only used to score and tailor your resume."] })]
				})
			]
		})
	});
}
//#endregion
//#region resources/js/Layouts/MainLayout.jsx
/**
* Public pages: title, description, canonical URL and Open Graph tags, the flash message and the footer.
* Everything here renders the same on the server (SSR) and in the browser.
*/
function MainLayout({ children, seo = {} }) {
	const { props } = usePage();
	const siteName = props.site?.name || "ResumeTailor AI";
	const title = seo.title ? `${seo.title} | ${siteName}` : `${siteName}: ATS resume checker and CV tailoring`;
	const description = seo.description || "Check your CV against any job description, see your ATS score and tailor your resume with the job's keywords.";
	const canonical = props.site?.canonical;
	const flash = props.flash?.status;
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs(Head, { children: [
		/* @__PURE__ */ jsx("title", { children: title }),
		/* @__PURE__ */ jsx("meta", {
			name: "description",
			content: description
		}),
		canonical && /* @__PURE__ */ jsx("link", {
			rel: "canonical",
			href: canonical
		}),
		/* @__PURE__ */ jsx("meta", {
			property: "og:site_name",
			content: siteName
		}),
		/* @__PURE__ */ jsx("meta", {
			property: "og:title",
			content: title
		}),
		/* @__PURE__ */ jsx("meta", {
			property: "og:description",
			content: description
		}),
		/* @__PURE__ */ jsx("meta", {
			property: "og:type",
			content: seo.type || "website"
		}),
		canonical && /* @__PURE__ */ jsx("meta", {
			property: "og:url",
			content: canonical
		}),
		/* @__PURE__ */ jsx("meta", {
			name: "twitter:card",
			content: "summary"
		})
	] }), /* @__PURE__ */ jsxs("main", {
		className: "position-relative min-vh-100 d-flex flex-column",
		children: [
			flash && /* @__PURE__ */ jsxs("div", {
				className: "alert alert-success alert-dismissible fade show rounded-0 mb-0 py-2 text-center",
				role: "status",
				children: [flash, /* @__PURE__ */ jsx("button", {
					type: "button",
					className: "btn-close",
					"data-bs-dismiss": "alert",
					"aria-label": "Close"
				})]
			}),
			children,
			/* @__PURE__ */ jsx(Footer, {})
		]
	})] });
}
//#endregion
//#region resources/js/Layouts/AuthLayout.jsx
function AuthLayout({ title, subtitle, children, footer, seo }) {
	return /* @__PURE__ */ jsxs(MainLayout, {
		seo: seo || { title },
		children: [/* @__PURE__ */ jsx(NavBar, {}), /* @__PURE__ */ jsx("div", {
			className: "container py-5",
			children: /* @__PURE__ */ jsx("div", {
				className: "row justify-content-center",
				children: /* @__PURE__ */ jsxs("div", {
					className: "col-md-7 col-lg-5",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "rt-card p-4 p-lg-5",
						children: [
							/* @__PURE__ */ jsx("h1", {
								className: "h4 fw-bold mb-1",
								children: title
							}),
							subtitle && /* @__PURE__ */ jsx("p", {
								className: "text-muted small mb-4",
								children: subtitle
							}),
							children
						]
					}), footer]
				})
			})
		})]
	});
}
//#endregion
//#region resources/js/Pages/Auth/ConfirmPassword.jsx
var ConfirmPassword_exports = /* @__PURE__ */ __exportAll({ default: () => ConfirmPassword });
function ConfirmPassword() {
	const { data, setData, post, processing, errors, reset } = useForm({ password: "" });
	const submit = (event) => {
		event.preventDefault();
		post("/confirm-password", { onFinish: () => reset("password") });
	};
	return /* @__PURE__ */ jsxs(AuthLayout, {
		title: "Confirm your password",
		subtitle: "This is a secure area. Please confirm your password before continuing.",
		children: [/* @__PURE__ */ jsx(Head, { title: "Confirm password" }), /* @__PURE__ */ jsxs("form", {
			onSubmit: submit,
			noValidate: true,
			children: [/* @__PURE__ */ jsxs("div", {
				className: "mb-4",
				children: [
					/* @__PURE__ */ jsx("label", {
						htmlFor: "password",
						className: "form-label fw-semibold",
						children: "Password"
					}),
					/* @__PURE__ */ jsx("input", {
						id: "password",
						type: "password",
						className: `form-control ${errors.password ? "is-invalid" : ""}`,
						value: data.password,
						autoComplete: "current-password",
						autoFocus: true,
						onChange: (event) => setData("password", event.target.value)
					}),
					errors.password && /* @__PURE__ */ jsx("div", {
						className: "invalid-feedback",
						children: errors.password
					})
				]
			}), /* @__PURE__ */ jsx("button", {
				type: "submit",
				className: "btn btn-primary w-100",
				disabled: processing,
				children: processing ? "Confirming..." : "Confirm"
			})]
		})]
	});
}
//#endregion
//#region resources/js/Pages/Auth/ForgotPassword.jsx
var ForgotPassword_exports = /* @__PURE__ */ __exportAll({ default: () => ForgotPassword });
function ForgotPassword({ status }) {
	const { data, setData, post, processing, errors } = useForm({ email: "" });
	const submit = (event) => {
		event.preventDefault();
		post("/forgot-password");
	};
	return /* @__PURE__ */ jsxs(AuthLayout, {
		title: "Forgot your password?",
		subtitle: "Enter your email and we will send you a link to reset it.",
		children: [
			/* @__PURE__ */ jsx(Head, { title: "Forgot password" }),
			status && /* @__PURE__ */ jsx("div", {
				className: "alert alert-success py-2 small",
				children: status
			}),
			/* @__PURE__ */ jsxs("form", {
				onSubmit: submit,
				noValidate: true,
				children: [/* @__PURE__ */ jsxs("div", {
					className: "mb-4",
					children: [
						/* @__PURE__ */ jsx("label", {
							htmlFor: "email",
							className: "form-label fw-semibold",
							children: "Email"
						}),
						/* @__PURE__ */ jsx("input", {
							id: "email",
							type: "email",
							className: `form-control ${errors.email ? "is-invalid" : ""}`,
							value: data.email,
							autoComplete: "username",
							autoFocus: true,
							onChange: (event) => setData("email", event.target.value)
						}),
						errors.email && /* @__PURE__ */ jsx("div", {
							className: "invalid-feedback",
							children: errors.email
						})
					]
				}), /* @__PURE__ */ jsx("button", {
					type: "submit",
					className: "btn btn-primary w-100",
					disabled: processing,
					children: processing ? "Sending..." : "Email password reset link"
				})]
			}),
			/* @__PURE__ */ jsx("p", {
				className: "text-center text-muted small mt-4 mb-0",
				children: /* @__PURE__ */ jsx(Link, {
					href: "/login",
					children: "Back to log in"
				})
			})
		]
	});
}
//#endregion
//#region resources/js/Pages/Auth/Login.jsx
var Login_exports = /* @__PURE__ */ __exportAll({ default: () => Login });
function Login({ canResetPassword, status }) {
	const { data, setData, post, processing, errors, reset } = useForm({
		email: "",
		password: "",
		remember: false
	});
	const submit = (event) => {
		event.preventDefault();
		post("/login", { onFinish: () => reset("password") });
	};
	return /* @__PURE__ */ jsxs(AuthLayout, {
		title: "Welcome back",
		subtitle: "Log in to keep your resume library and job matches in sync.",
		children: [
			/* @__PURE__ */ jsx(Head, { title: "Log in" }),
			status && /* @__PURE__ */ jsx("div", {
				className: "alert alert-success py-2 small",
				children: status
			}),
			/* @__PURE__ */ jsxs("form", {
				onSubmit: submit,
				noValidate: true,
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "mb-3",
						children: [
							/* @__PURE__ */ jsx("label", {
								htmlFor: "email",
								className: "form-label fw-semibold",
								children: "Email"
							}),
							/* @__PURE__ */ jsx("input", {
								id: "email",
								type: "email",
								className: `form-control ${errors.email ? "is-invalid" : ""}`,
								value: data.email,
								autoComplete: "username",
								autoFocus: true,
								onChange: (event) => setData("email", event.target.value)
							}),
							errors.email && /* @__PURE__ */ jsx("div", {
								className: "invalid-feedback",
								children: errors.email
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mb-3",
						children: [
							/* @__PURE__ */ jsx("label", {
								htmlFor: "password",
								className: "form-label fw-semibold",
								children: "Password"
							}),
							/* @__PURE__ */ jsx("input", {
								id: "password",
								type: "password",
								className: `form-control ${errors.password ? "is-invalid" : ""}`,
								value: data.password,
								autoComplete: "current-password",
								onChange: (event) => setData("password", event.target.value)
							}),
							errors.password && /* @__PURE__ */ jsx("div", {
								className: "invalid-feedback",
								children: errors.password
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "d-flex justify-content-between align-items-center mb-4",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "form-check",
							children: [/* @__PURE__ */ jsx("input", {
								id: "remember",
								type: "checkbox",
								className: "form-check-input",
								checked: data.remember,
								onChange: (event) => setData("remember", event.target.checked)
							}), /* @__PURE__ */ jsx("label", {
								htmlFor: "remember",
								className: "form-check-label small",
								children: "Remember me"
							})]
						}), canResetPassword && /* @__PURE__ */ jsx(Link, {
							href: "/forgot-password",
							className: "small",
							children: "Forgot password?"
						})]
					}),
					/* @__PURE__ */ jsx("button", {
						type: "submit",
						className: "btn btn-primary w-100",
						disabled: processing,
						children: processing ? "Logging in..." : "Log in"
					})
				]
			}),
			/* @__PURE__ */ jsxs("p", {
				className: "text-center text-muted small mt-4 mb-0",
				children: ["New here? ", /* @__PURE__ */ jsx(Link, {
					href: "/register",
					children: "Create an account"
				})]
			})
		]
	});
}
//#endregion
//#region resources/js/Pages/Auth/Register.jsx
var Register_exports = /* @__PURE__ */ __exportAll({ default: () => Register });
function Register() {
	const { data, setData, post, processing, errors, reset } = useForm({
		name: "",
		email: "",
		password: "",
		password_confirmation: ""
	});
	const submit = (event) => {
		event.preventDefault();
		post("/register", { onFinish: () => reset("password", "password_confirmation") });
	};
	return /* @__PURE__ */ jsxs(AuthLayout, {
		title: "Create your account",
		subtitle: "Save your CV once and get ranked job matches from live postings.",
		children: [
			/* @__PURE__ */ jsx(Head, { title: "Sign up" }),
			/* @__PURE__ */ jsxs("form", {
				onSubmit: submit,
				noValidate: true,
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "mb-3",
						children: [
							/* @__PURE__ */ jsx("label", {
								htmlFor: "name",
								className: "form-label fw-semibold",
								children: "Name"
							}),
							/* @__PURE__ */ jsx("input", {
								id: "name",
								type: "text",
								className: `form-control ${errors.name ? "is-invalid" : ""}`,
								value: data.name,
								autoComplete: "name",
								autoFocus: true,
								onChange: (event) => setData("name", event.target.value)
							}),
							errors.name && /* @__PURE__ */ jsx("div", {
								className: "invalid-feedback",
								children: errors.name
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mb-3",
						children: [
							/* @__PURE__ */ jsx("label", {
								htmlFor: "email",
								className: "form-label fw-semibold",
								children: "Email"
							}),
							/* @__PURE__ */ jsx("input", {
								id: "email",
								type: "email",
								className: `form-control ${errors.email ? "is-invalid" : ""}`,
								value: data.email,
								autoComplete: "username",
								onChange: (event) => setData("email", event.target.value)
							}),
							errors.email && /* @__PURE__ */ jsx("div", {
								className: "invalid-feedback",
								children: errors.email
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mb-3",
						children: [
							/* @__PURE__ */ jsx("label", {
								htmlFor: "password",
								className: "form-label fw-semibold",
								children: "Password"
							}),
							/* @__PURE__ */ jsx("input", {
								id: "password",
								type: "password",
								className: `form-control ${errors.password ? "is-invalid" : ""}`,
								value: data.password,
								autoComplete: "new-password",
								onChange: (event) => setData("password", event.target.value)
							}),
							errors.password && /* @__PURE__ */ jsx("div", {
								className: "invalid-feedback",
								children: errors.password
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mb-4",
						children: [/* @__PURE__ */ jsx("label", {
							htmlFor: "password_confirmation",
							className: "form-label fw-semibold",
							children: "Confirm password"
						}), /* @__PURE__ */ jsx("input", {
							id: "password_confirmation",
							type: "password",
							className: "form-control",
							value: data.password_confirmation,
							autoComplete: "new-password",
							onChange: (event) => setData("password_confirmation", event.target.value)
						})]
					}),
					/* @__PURE__ */ jsx("button", {
						type: "submit",
						className: "btn btn-primary w-100",
						disabled: processing,
						children: processing ? "Creating account..." : "Create account"
					})
				]
			}),
			/* @__PURE__ */ jsxs("p", {
				className: "text-center text-muted small mt-4 mb-0",
				children: ["Already registered? ", /* @__PURE__ */ jsx(Link, {
					href: "/login",
					children: "Log in"
				})]
			})
		]
	});
}
//#endregion
//#region resources/js/Pages/Auth/ResetPassword.jsx
var ResetPassword_exports = /* @__PURE__ */ __exportAll({ default: () => ResetPassword });
function ResetPassword({ token, email }) {
	const { data, setData, post, processing, errors, reset } = useForm({
		token,
		email: email || "",
		password: "",
		password_confirmation: ""
	});
	const submit = (event) => {
		event.preventDefault();
		post("/reset-password", { onFinish: () => reset("password", "password_confirmation") });
	};
	return /* @__PURE__ */ jsxs(AuthLayout, {
		title: "Reset your password",
		subtitle: "Choose a new password for your account.",
		children: [/* @__PURE__ */ jsx(Head, { title: "Reset password" }), /* @__PURE__ */ jsxs("form", {
			onSubmit: submit,
			noValidate: true,
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "mb-3",
					children: [
						/* @__PURE__ */ jsx("label", {
							htmlFor: "email",
							className: "form-label fw-semibold",
							children: "Email"
						}),
						/* @__PURE__ */ jsx("input", {
							id: "email",
							type: "email",
							className: `form-control ${errors.email ? "is-invalid" : ""}`,
							value: data.email,
							autoComplete: "username",
							onChange: (event) => setData("email", event.target.value)
						}),
						errors.email && /* @__PURE__ */ jsx("div", {
							className: "invalid-feedback",
							children: errors.email
						})
					]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "mb-3",
					children: [
						/* @__PURE__ */ jsx("label", {
							htmlFor: "password",
							className: "form-label fw-semibold",
							children: "New password"
						}),
						/* @__PURE__ */ jsx("input", {
							id: "password",
							type: "password",
							className: `form-control ${errors.password ? "is-invalid" : ""}`,
							value: data.password,
							autoComplete: "new-password",
							autoFocus: true,
							onChange: (event) => setData("password", event.target.value)
						}),
						errors.password && /* @__PURE__ */ jsx("div", {
							className: "invalid-feedback",
							children: errors.password
						})
					]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "mb-4",
					children: [/* @__PURE__ */ jsx("label", {
						htmlFor: "password_confirmation",
						className: "form-label fw-semibold",
						children: "Confirm password"
					}), /* @__PURE__ */ jsx("input", {
						id: "password_confirmation",
						type: "password",
						className: "form-control",
						value: data.password_confirmation,
						autoComplete: "new-password",
						onChange: (event) => setData("password_confirmation", event.target.value)
					})]
				}),
				/* @__PURE__ */ jsx("button", {
					type: "submit",
					className: "btn btn-primary w-100",
					disabled: processing,
					children: processing ? "Resetting..." : "Reset password"
				})
			]
		})]
	});
}
//#endregion
//#region resources/js/Pages/Auth/VerifyEmail.jsx
var VerifyEmail_exports = /* @__PURE__ */ __exportAll({ default: () => VerifyEmail });
function VerifyEmail({ status }) {
	const { post, processing } = useForm({});
	const submit = (event) => {
		event.preventDefault();
		post("/email/verification-notification");
	};
	return /* @__PURE__ */ jsxs(AuthLayout, {
		title: "Verify your email",
		subtitle: "We sent a verification link to your inbox. Click it to unlock your resume library and saved matches.",
		children: [
			/* @__PURE__ */ jsx(Head, { title: "Verify email" }),
			status === "verification-link-sent" && /* @__PURE__ */ jsx("div", {
				className: "alert alert-success py-2 small",
				children: "A new verification link has been sent to your email address."
			}),
			/* @__PURE__ */ jsx("form", {
				onSubmit: submit,
				children: /* @__PURE__ */ jsx("button", {
					type: "submit",
					className: "btn btn-primary w-100",
					disabled: processing,
					children: processing ? "Sending..." : "Resend verification email"
				})
			}),
			/* @__PURE__ */ jsx("p", {
				className: "text-center text-muted small mt-4 mb-0",
				children: /* @__PURE__ */ jsx(Link, {
					href: "/logout",
					method: "post",
					as: "button",
					className: "btn btn-link btn-sm p-0",
					children: "Log out"
				})
			})
		]
	});
}
//#endregion
//#region resources/js/Components/AdSlot.jsx
/**
* One responsive AdSense unit. Renders nothing when ads are off, the ad unit is not configured or the
* visitor is on Pro (the server sends no "ads" prop then). The AdSense script is loaded once, on the
* first page that shows an ad, so tool and account pages never load it.
*/
function AdSlot({ slot = "in_article", className = "" }) {
	const ads = usePage().props.ads;
	const adSlotId = ads?.slots?.[slot];
	const insRef = useRef(null);
	useEffect(() => {
		if (!ads?.client || !adSlotId || !insRef.current || insRef.current.dataset.adsbygoogleStatus) return;
		const scriptId = "adsbygoogle-js";
		if (!document.getElementById(scriptId)) {
			const script = document.createElement("script");
			script.id = scriptId;
			script.async = true;
			script.crossOrigin = "anonymous";
			script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ads.client)}`;
			document.head.appendChild(script);
		}
		try {
			(window.adsbygoogle = window.adsbygoogle || []).push({});
		} catch {}
	}, [ads?.client, adSlotId]);
	if (!ads?.client || !adSlotId) return null;
	return /* @__PURE__ */ jsxs("aside", {
		className: `rt-ad ${className}`,
		"aria-label": "Advertisement",
		children: [/* @__PURE__ */ jsx("span", {
			className: "rt-ad-label",
			children: "Advertisement"
		}), /* @__PURE__ */ jsx("ins", {
			ref: insRef,
			className: "adsbygoogle",
			style: { display: "block" },
			"data-ad-client": ads.client,
			"data-ad-slot": adSlotId,
			"data-ad-format": "auto",
			"data-full-width-responsive": "true"
		})]
	});
}
//#endregion
//#region resources/js/Components/PostCard.jsx
var formatPostDate = (value) => value ? new Date(value).toLocaleDateString("en-GB", {
	day: "numeric",
	month: "short",
	year: "numeric"
}) : "";
function PostCard({ post }) {
	return /* @__PURE__ */ jsxs(Link, {
		href: `/blog/${post.slug}`,
		className: "rt-card rt-post-card h-100",
		children: [
			/* @__PURE__ */ jsx("span", {
				className: "rt-post-category",
				children: post.category
			}),
			/* @__PURE__ */ jsx("h2", {
				className: "rt-post-title",
				children: post.title
			}),
			/* @__PURE__ */ jsx("p", {
				className: "rt-post-excerpt",
				children: post.excerpt
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "rt-post-meta",
				children: [
					/* @__PURE__ */ jsx("span", { children: formatPostDate(post.published_at) }),
					/* @__PURE__ */ jsx("span", { children: "·" }),
					/* @__PURE__ */ jsxs("span", { children: [post.reading_minutes, " min read"] }),
					/* @__PURE__ */ jsxs("span", {
						className: "ms-auto rt-post-more",
						children: ["Read ", /* @__PURE__ */ jsx("i", { className: "bi bi-arrow-right" })]
					})
				]
			})
		]
	});
}
//#endregion
//#region resources/js/Components/PageHero.jsx
/**
* The gradient header used by content pages (About, Contact, legal pages, blog).
*/
function PageHero({ eyebrow, icon = "bi-stars", title, lead, children = null }) {
	return /* @__PURE__ */ jsx("header", {
		className: "rt-hero rt-hero-compact",
		children: /* @__PURE__ */ jsxs("div", {
			className: "container",
			children: [
				eyebrow && /* @__PURE__ */ jsxs("span", {
					className: "rt-pill mb-3",
					children: [/* @__PURE__ */ jsx("i", { className: `bi ${icon}` }), eyebrow]
				}),
				/* @__PURE__ */ jsx("h1", {
					className: "mb-3",
					children: title
				}),
				lead && /* @__PURE__ */ jsx("p", {
					className: "rt-hero-lead mb-0",
					children: lead
				}),
				children
			]
		})
	});
}
//#endregion
//#region resources/js/Pages/Blog/Index.jsx
var Index_exports$4 = /* @__PURE__ */ __exportAll({ default: () => BlogIndex });
function BlogIndex({ posts, categories, category, seo }) {
	return /* @__PURE__ */ jsxs(MainLayout, {
		seo,
		children: [
			/* @__PURE__ */ jsx(NavBar, {}),
			/* @__PURE__ */ jsx(PageHero, {
				eyebrow: "Guides",
				icon: "bi-journal-text",
				title: "CV and job search guides",
				lead: "Practical, no-nonsense advice on ATS-friendly CVs, keywords, applications and interviews."
			}),
			/* @__PURE__ */ jsx("div", {
				className: "container pb-5",
				children: /* @__PURE__ */ jsxs("div", {
					className: "rt-overlap",
					children: [
						categories.length > 1 && /* @__PURE__ */ jsxs("div", {
							className: "rt-card p-2 mb-4 d-flex flex-wrap gap-1",
							children: [/* @__PURE__ */ jsx(Link, {
								href: "/blog",
								className: `rt-nav-link ${category === null ? "is-active" : ""}`,
								preserveScroll: true,
								children: "All guides"
							}), categories.map((name) => /* @__PURE__ */ jsx(Link, {
								href: `/blog?category=${encodeURIComponent(name)}`,
								className: `rt-nav-link ${category === name ? "is-active" : ""}`,
								preserveScroll: true,
								children: name
							}, name))]
						}),
						posts.data.length === 0 ? /* @__PURE__ */ jsxs("div", {
							className: "rt-card p-5 text-center",
							children: [
								/* @__PURE__ */ jsx("i", {
									className: "bi bi-journal",
									style: {
										fontSize: "2rem",
										color: "var(--rt-muted)"
									}
								}),
								/* @__PURE__ */ jsx("h2", {
									className: "h6 fw-bold mt-3",
									children: "No guides here yet"
								}),
								/* @__PURE__ */ jsx("p", {
									className: "text-muted small mb-0",
									children: "New articles are on the way."
								})
							]
						}) : /* @__PURE__ */ jsx("div", {
							className: "row g-4",
							children: posts.data.map((post, index) => /* @__PURE__ */ jsxs(React.Fragment, { children: [/* @__PURE__ */ jsx("div", {
								className: "col-md-6 col-lg-4",
								children: /* @__PURE__ */ jsx(PostCard, { post })
							}), index === 2 && posts.data.length > 3 && /* @__PURE__ */ jsx("div", {
								className: "col-12",
								children: /* @__PURE__ */ jsx(AdSlot, { slot: "in_feed" })
							})] }, post.id))
						}),
						posts.last_page > 1 && /* @__PURE__ */ jsxs("nav", {
							className: "d-flex justify-content-between mt-4",
							"aria-label": "Pages",
							children: [posts.prev_page_url ? /* @__PURE__ */ jsxs(Link, {
								href: posts.prev_page_url,
								className: "btn btn-light border",
								children: [/* @__PURE__ */ jsx("i", { className: "bi bi-arrow-left me-1" }), "Newer"]
							}) : /* @__PURE__ */ jsx("span", {}), posts.next_page_url && /* @__PURE__ */ jsxs(Link, {
								href: posts.next_page_url,
								className: "btn btn-light border",
								children: ["Older", /* @__PURE__ */ jsx("i", { className: "bi bi-arrow-right ms-1" })]
							})]
						})
					]
				})
			})
		]
	});
}
//#endregion
//#region resources/js/Pages/Blog/Show.jsx
var Show_exports$1 = /* @__PURE__ */ __exportAll({ default: () => BlogShow });
function BlogShow({ post, related, seo }) {
	return /* @__PURE__ */ jsxs(MainLayout, {
		seo,
		children: [
			/* @__PURE__ */ jsx(NavBar, {}),
			/* @__PURE__ */ jsx("header", {
				className: "rt-hero rt-hero-compact rt-article-hero",
				children: /* @__PURE__ */ jsxs("div", {
					className: "container",
					style: { maxWidth: "48rem" },
					children: [
						/* @__PURE__ */ jsxs(Link, {
							href: `/blog?category=${encodeURIComponent(post.category)}`,
							className: "rt-pill mb-3 text-decoration-none",
							children: [/* @__PURE__ */ jsx("i", { className: "bi bi-journal-text" }), post.category]
						}),
						/* @__PURE__ */ jsx("h1", {
							className: "mb-3",
							children: post.title
						}),
						/* @__PURE__ */ jsx("p", {
							className: "rt-hero-lead mb-3",
							children: post.excerpt
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "rt-article-meta",
							children: [
								/* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("i", { className: "bi bi-person" }), post.author] }),
								post.published_at && /* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("i", { className: "bi bi-calendar3" }), formatPostDate(post.published_at)] }),
								/* @__PURE__ */ jsxs("span", { children: [
									/* @__PURE__ */ jsx("i", { className: "bi bi-clock" }),
									post.reading_minutes,
									" min read"
								] })
							]
						})
					]
				})
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "container pb-5",
				style: { maxWidth: "48rem" },
				children: [
					!post.is_published && /* @__PURE__ */ jsxs("div", {
						className: "alert alert-warning mt-3",
						children: [/* @__PURE__ */ jsx("i", { className: "bi bi-eye me-2" }), "Draft preview. Only admins can see this post until it is published."]
					}),
					/* @__PURE__ */ jsx("article", {
						className: "rt-card rt-overlap p-4 p-lg-5 mb-4",
						children: /* @__PURE__ */ jsx("div", {
							className: "rt-prose rt-article",
							dangerouslySetInnerHTML: { __html: post.body_html }
						})
					}),
					/* @__PURE__ */ jsx(AdSlot, {
						slot: "in_article",
						className: "mb-4"
					}),
					/* @__PURE__ */ jsxs("section", {
						className: "rt-card p-4 p-lg-5 mb-5 text-center rt-article-cta",
						children: [
							/* @__PURE__ */ jsx("h2", {
								className: "h5 fw-bold mb-2",
								children: "See how your CV scores for a real job"
							}),
							/* @__PURE__ */ jsx("p", {
								className: "text-muted mb-3",
								children: "Paste a job description, upload your CV and get your ATS match score with fixes. Free and unlimited."
							}),
							/* @__PURE__ */ jsx(Link, {
								href: "/",
								className: "btn rt-btn-primary px-4",
								children: "Check my CV now"
							})
						]
					}),
					related.length > 0 && /* @__PURE__ */ jsxs("section", { children: [/* @__PURE__ */ jsxs("h2", {
						className: "h5 fw-bold mb-3",
						children: [
							"More ",
							post.category.toLowerCase(),
							" guides"
						]
					}), /* @__PURE__ */ jsx("div", {
						className: "row g-3",
						children: related.map((item) => /* @__PURE__ */ jsx("div", {
							className: "col-md-4",
							children: /* @__PURE__ */ jsx(PostCard, { post: item })
						}, item.id))
					})] })
				]
			})
		]
	});
}
//#endregion
//#region resources/js/Pages/Jobs/Index.jsx
var Index_exports$3 = /* @__PURE__ */ __exportAll({ default: () => JobsIndex });
var ALLOWED_TYPES$2 = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
var MAX_FILE_BYTES$2 = 5242880;
var EMPLOYMENT_TYPES$1 = [
	"full_time",
	"part_time",
	"contract",
	"temporary",
	"internship"
];
var POSTED_WITHIN = [
	1,
	3,
	7,
	14,
	30
];
var label$1 = (value) => value.replace("_", " ");
var scoreTone$2 = (score) => score >= 75 ? "success" : score >= 50 ? "warning" : "danger";
var formatDate$5 = (value) => {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString(void 0, {
		month: "short",
		day: "numeric"
	});
};
var formatSalary$1 = (job) => {
	if (!job.salary_min && !job.salary_max) return null;
	const amount = (value) => value?.toLocaleString();
	const currency = job.currency ? `${job.currency} ` : "";
	if (job.salary_min && job.salary_max) return `${currency}${amount(job.salary_min)} - ${amount(job.salary_max)}`;
	return `${currency}${amount(job.salary_min || job.salary_max)}`;
};
var errorMessage$1 = (err, fallback) => {
	const errors = err?.response?.data?.errors;
	if (errors) return Object.values(errors).flat()[0];
	if (err?.response?.status === 429) return "Too many scans. Please wait a few minutes and try again.";
	if (!err?.response) return "The connection to the server was lost. Please try again.";
	return err?.response?.data?.message || err?.message || fallback;
};
function StatusBanner({ status }) {
	if (!status) return null;
	const total = status.total || 0;
	const completed = status.completed || 0;
	const percent = total > 0 ? Math.min(100, Math.round(completed / total * 100)) : 8;
	if (status.status === "queued" || status.status === "running") return /* @__PURE__ */ jsxs("div", {
		className: "alert alert-info rt-fade-in",
		role: "status",
		"aria-live": "polite",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "d-flex justify-content-between align-items-center gap-2",
			children: [/* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("span", {
				className: "spinner-border spinner-border-sm me-2",
				"aria-hidden": "true"
			}), status.status === "queued" ? "Queued. Scanning job postings..." : "Scoring job postings..."] }), /* @__PURE__ */ jsx("span", {
				className: "small text-nowrap",
				children: total > 0 ? `${completed}/${total}` : "starting"
			})]
		}), /* @__PURE__ */ jsx("div", {
			className: "progress mt-2",
			style: { height: ".4rem" },
			children: /* @__PURE__ */ jsx("div", {
				className: "progress-bar",
				style: { width: `${percent}%` }
			})
		})]
	});
	if (status.status === "failed") return /* @__PURE__ */ jsxs("div", {
		className: "alert alert-danger py-2 small rt-fade-in",
		role: "alert",
		children: [/* @__PURE__ */ jsx("i", { className: "bi bi-exclamation-octagon me-2" }), status.message || "The scan failed. Please try again."]
	});
	if (status.status === "completed") return /* @__PURE__ */ jsxs("div", {
		className: "alert alert-success py-2 small rt-fade-in",
		role: "status",
		children: [
			/* @__PURE__ */ jsx("i", { className: "bi bi-check-circle me-2" }),
			"Scored ",
			completed,
			" job",
			completed === 1 ? "" : "s",
			status.failed > 0 ? ` (${status.failed} could not be scored)` : "",
			"."
		]
	});
	return null;
}
var timeAgo = (value) => {
	if (!value) return null;
	const days = Math.floor((Date.now() - new Date(value).getTime()) / 864e5);
	if (Number.isNaN(days)) return null;
	if (days <= 0) return "Today";
	if (days === 1) return "Yesterday";
	if (days < 30) return `${days} days ago`;
	return formatDate$5(value);
};
var AVATAR_TONES = [
	"indigo",
	"violet",
	"green",
	"sky",
	"amber",
	"rose"
];
var avatarTone = (text = "") => AVATAR_TONES[[...text].reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_TONES.length];
/**
* A small circular gauge with the match score, or a dash when the job has not been scored.
*/
function MatchRing({ match }) {
	const radius = 22;
	const circumference = 2 * Math.PI * radius;
	const tone = match ? scoreTone$2(match.score) : "muted";
	const colors = {
		success: "var(--rt-success)",
		warning: "var(--rt-warning)",
		danger: "var(--rt-danger)",
		muted: "#cbd5e1"
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "rt-ring",
		"aria-label": match ? `${match.score}% match` : "Not scored",
		children: [/* @__PURE__ */ jsxs("svg", {
			viewBox: "0 0 52 52",
			"aria-hidden": "true",
			children: [/* @__PURE__ */ jsx("circle", {
				cx: "26",
				cy: "26",
				r: radius,
				fill: "none",
				stroke: "#eef2f7",
				strokeWidth: "5"
			}), match && /* @__PURE__ */ jsx("circle", {
				cx: "26",
				cy: "26",
				r: radius,
				fill: "none",
				stroke: colors[tone],
				strokeWidth: "5",
				strokeLinecap: "round",
				strokeDasharray: circumference,
				strokeDashoffset: circumference * (1 - match.score / 100),
				transform: "rotate(-90 26 26)"
			})]
		}), /* @__PURE__ */ jsx("span", {
			className: "rt-ring-value",
			style: { color: match ? colors[tone] : "var(--rt-muted)" },
			children: match ? match.score : "—"
		})]
	});
}
function JobsIndex({ jobs, filters, status, hasCv, cvFilename, canSaveSearch, defaultMinScore, seo }) {
	const user = usePage().props.auth?.user;
	const [search, setSearch] = useState(filters.search || "");
	const [location, setLocation] = useState(filters.location || "");
	const [remote, setRemote] = useState(Boolean(filters.remote));
	const [sort, setSort] = useState(filters.sort || "newest");
	const [employmentType, setEmploymentType] = useState(filters.employment_type || "");
	const [salaryMin, setSalaryMin] = useState(filters.salary_min ?? "");
	const [salaryMax, setSalaryMax] = useState(filters.salary_max ?? "");
	const [postedWithin, setPostedWithin] = useState(filters.posted_within_days ?? "");
	const [searchName, setSearchName] = useState("");
	const [saveMinScore, setSaveMinScore] = useState(defaultMinScore);
	const [saveAlerts, setSaveAlerts] = useState(true);
	const [cvFile, setCvFile] = useState(null);
	const [isDragging, setIsDragging] = useState(false);
	const [isScanning, setIsScanning] = useState(false);
	const [error, setError] = useState("");
	const fileInput = useRef(null);
	const isWorking = isScanning || status?.status === "queued" || status?.status === "running";
	useEffect(() => {
		if (!isWorking) return;
		const timer = setInterval(() => {
			router.reload({
				only: ["jobs", "status"],
				preserveState: true,
				preserveScroll: true
			});
		}, 3e3);
		return () => clearInterval(timer);
	}, [isWorking]);
	useEffect(() => {
		if (status?.status === "completed" || status?.status === "failed") setIsScanning(false);
	}, [status?.status]);
	const selectFile = (file) => {
		setError("");
		if (!file) return;
		if (!ALLOWED_TYPES$2.includes(file.type) && !/\.(pdf|docx)$/i.test(file.name)) {
			setError("Please upload your CV as a PDF or DOCX file.");
			return;
		}
		if (file.size > MAX_FILE_BYTES$2) {
			setError("File size must be under 5MB.");
			return;
		}
		setCvFile(file);
	};
	const handleScan = async (event) => {
		event.preventDefault();
		setError("");
		if (!cvFile && !hasCv) {
			setError("Please upload your CV first.");
			return;
		}
		setIsScanning(true);
		try {
			const formData = new FormData();
			if (cvFile) formData.append("cv_file", cvFile);
			formData.append("search", search);
			formData.append("location", location);
			formData.append("remote", remote ? "1" : "0");
			if (employmentType) formData.append("employment_type", employmentType);
			if (salaryMin !== "") formData.append("salary_min", salaryMin);
			if (salaryMax !== "") formData.append("salary_max", salaryMax);
			if (postedWithin !== "") formData.append("posted_within_days", postedWithin);
			await axios.post("/jobs/scan", formData, { headers: { Accept: "application/json" } });
			router.reload({
				only: [
					"jobs",
					"status",
					"hasCv",
					"cvFilename"
				],
				preserveState: true,
				preserveScroll: true
			});
		} catch (err) {
			setError(errorMessage$1(err, "Could not start the scan. Please try again."));
			setIsScanning(false);
		}
	};
	const currentFilters = (overrides = {}) => ({
		search,
		location,
		remote: remote ? 1 : 0,
		employment_type: employmentType,
		salary_min: salaryMin,
		salary_max: salaryMax,
		posted_within_days: postedWithin,
		sort,
		...overrides
	});
	const visit = (query) => {
		const cleaned = Object.fromEntries(Object.entries(query).filter(([, value]) => value !== "" && value !== null && value !== 0 && value !== "0"));
		router.get("/jobs", cleaned, {
			preserveState: true,
			preserveScroll: true,
			replace: true
		});
	};
	const applyFilters = (event) => {
		event?.preventDefault();
		visit(currentFilters());
	};
	const changeSort = (value) => {
		setSort(value);
		visit(currentFilters({ sort: value }));
	};
	const activeFilters = [
		filters.search && {
			key: "search",
			label: `“${filters.search}”`,
			clear: () => {
				setSearch("");
				visit(currentFilters({ search: "" }));
			}
		},
		filters.location && {
			key: "location",
			label: filters.location,
			icon: "bi-geo-alt",
			clear: () => {
				setLocation("");
				visit(currentFilters({ location: "" }));
			}
		},
		filters.remote && {
			key: "remote",
			label: "Remote",
			icon: "bi-house-door",
			clear: () => {
				setRemote(false);
				visit(currentFilters({ remote: 0 }));
			}
		},
		filters.employment_type && {
			key: "type",
			label: label$1(filters.employment_type),
			clear: () => {
				setEmploymentType("");
				visit(currentFilters({ employment_type: "" }));
			}
		},
		(filters.salary_min || filters.salary_max) && {
			key: "salary",
			label: `Salary ${filters.salary_min || 0}–${filters.salary_max || "any"}`,
			clear: () => {
				setSalaryMin("");
				setSalaryMax("");
				visit(currentFilters({
					salary_min: "",
					salary_max: ""
				}));
			}
		},
		filters.posted_within_days && {
			key: "posted",
			label: `Last ${filters.posted_within_days} day${Number(filters.posted_within_days) === 1 ? "" : "s"}`,
			clear: () => {
				setPostedWithin("");
				visit(currentFilters({ posted_within_days: "" }));
			}
		}
	].filter(Boolean);
	const saveSearch = (event) => {
		event.preventDefault();
		router.post("/saved-searches", {
			name: searchName,
			query: search,
			filters: {
				location,
				remote,
				employment_type: employmentType,
				salary_min: salaryMin,
				salary_max: salaryMax,
				posted_within_days: postedWithin
			},
			min_score: saveMinScore,
			alerts_enabled: saveAlerts
		}, {
			preserveScroll: true,
			onSuccess: () => setSearchName("")
		});
	};
	const toggleSaved = (job) => {
		if (!user) {
			router.get("/login");
			return;
		}
		if (job.saved) router.delete(`/saved-jobs/${job.saved.id}`, { preserveScroll: true });
		else router.post(`/jobs/${job.id}/save`, {}, { preserveScroll: true });
	};
	return /* @__PURE__ */ jsxs(MainLayout, {
		seo,
		children: [
			/* @__PURE__ */ jsx(NavBar, {}),
			/* @__PURE__ */ jsx("header", {
				className: "rt-hero rt-hero-compact rt-jobs-hero",
				children: /* @__PURE__ */ jsxs("div", {
					className: "container",
					children: [
						/* @__PURE__ */ jsxs("span", {
							className: "rt-pill mb-3",
							children: [/* @__PURE__ */ jsx("i", { className: "bi bi-briefcase" }), "Live job listings"]
						}),
						/* @__PURE__ */ jsx("h1", {
							className: "mb-2",
							children: "Find jobs that match your CV"
						}),
						/* @__PURE__ */ jsx("p", {
							className: "rt-hero-lead mb-4",
							children: "Search fresh listings, then score them against your CV with the same ATS engine as the resume tailor."
						}),
						/* @__PURE__ */ jsxs("form", {
							className: "rt-job-search",
							onSubmit: applyFilters,
							role: "search",
							children: [
								/* @__PURE__ */ jsxs("div", {
									className: "rt-job-search-field",
									children: [/* @__PURE__ */ jsx("i", { className: "bi bi-search" }), /* @__PURE__ */ jsx("input", {
										"aria-label": "Job title or keywords",
										value: search,
										onChange: (event) => setSearch(event.target.value),
										placeholder: "Job title, skill or company"
									})]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "rt-job-search-field",
									children: [/* @__PURE__ */ jsx("i", { className: "bi bi-geo-alt" }), /* @__PURE__ */ jsx("input", {
										"aria-label": "Location",
										value: location,
										onChange: (event) => setLocation(event.target.value),
										placeholder: "City, country or remote"
									})]
								}),
								/* @__PURE__ */ jsx("button", {
									type: "submit",
									className: "btn rt-btn-primary px-4",
									children: "Search jobs"
								})
							]
						})
					]
				})
			}),
			/* @__PURE__ */ jsx("div", {
				className: "container pb-5",
				children: /* @__PURE__ */ jsxs("div", {
					className: "row g-4 rt-overlap",
					children: [/* @__PURE__ */ jsxs("aside", {
						className: "col-lg-4 col-xl-3 order-2 order-lg-1",
						children: [
							/* @__PURE__ */ jsxs("section", {
								id: "your-cv",
								className: "rt-card p-4 mb-3",
								style: { scrollMarginTop: "5.5rem" },
								children: [
									/* @__PURE__ */ jsxs("h2", {
										className: "rt-card-title mb-1",
										children: [/* @__PURE__ */ jsx("i", { className: "bi bi-file-earmark-person" }), "Your CV"]
									}),
									/* @__PURE__ */ jsx("p", {
										className: "text-muted small mb-3",
										children: "Score the listings below against your CV to see where you rank."
									}),
									/* @__PURE__ */ jsxs("form", {
										onSubmit: handleScan,
										noValidate: true,
										children: [
											hasCv && cvFilename && !cvFile && /* @__PURE__ */ jsxs("div", {
												className: "rt-file-chip mb-2",
												children: [/* @__PURE__ */ jsx("i", { className: "bi bi-file-earmark-check" }), /* @__PURE__ */ jsxs("div", {
													className: "flex-grow-1 text-truncate",
													children: [/* @__PURE__ */ jsx("div", {
														className: "fw-semibold text-truncate small",
														children: cvFilename
													}), /* @__PURE__ */ jsx("small", {
														className: "text-muted",
														children: "Ready to score"
													})]
												})]
											}),
											/* @__PURE__ */ jsxs("label", {
												className: `rt-dropzone rt-dropzone-compact mb-3 ${isDragging ? "is-dragging" : ""}`,
												onDragOver: (event) => {
													event.preventDefault();
													setIsDragging(true);
												},
												onDragLeave: () => setIsDragging(false),
												onDrop: (event) => {
													event.preventDefault();
													setIsDragging(false);
													selectFile(event.dataTransfer.files?.[0]);
												},
												children: [
													/* @__PURE__ */ jsx("input", {
														ref: fileInput,
														type: "file",
														accept: ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
														onChange: (event) => selectFile(event.target.files?.[0])
													}),
													/* @__PURE__ */ jsx("i", { className: "bi bi-cloud-arrow-up" }),
													/* @__PURE__ */ jsx("span", {
														className: "fw-semibold small text-truncate",
														style: { maxWidth: "100%" },
														children: cvFile ? cvFile.name : hasCv ? "Use a different CV" : "Upload your CV"
													}),
													/* @__PURE__ */ jsx("small", {
														className: "text-muted",
														children: "PDF or DOCX · 5MB"
													})
												]
											}),
											error && /* @__PURE__ */ jsxs("div", {
												className: "alert alert-danger py-2 small",
												role: "alert",
												children: [/* @__PURE__ */ jsx("i", { className: "bi bi-exclamation-octagon me-1" }), error]
											}),
											/* @__PURE__ */ jsx("button", {
												className: "btn rt-btn-primary w-100",
												type: "submit",
												disabled: isWorking,
												children: isWorking ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("span", {
													className: "spinner-border spinner-border-sm me-2",
													"aria-hidden": "true"
												}), "Scoring..."] }) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("i", { className: "bi bi-radar me-2" }), "Score my matches"] })
											})
										]
									})
								]
							}),
							/* @__PURE__ */ jsxs("section", {
								className: "rt-card p-4 mb-3",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "d-flex justify-content-between align-items-center mb-3",
									children: [/* @__PURE__ */ jsxs("h2", {
										className: "rt-card-title",
										children: [/* @__PURE__ */ jsx("i", { className: "bi bi-sliders" }), "Filters"]
									}), /* @__PURE__ */ jsx(Link, {
										href: "/jobs",
										className: "small",
										children: "Reset"
									})]
								}), /* @__PURE__ */ jsxs("form", {
									onSubmit: applyFilters,
									className: "d-grid gap-3",
									children: [
										/* @__PURE__ */ jsxs("div", {
											className: "form-check form-switch",
											children: [/* @__PURE__ */ jsx("input", {
												id: "job-remote",
												className: "form-check-input",
												type: "checkbox",
												role: "switch",
												checked: remote,
												onChange: (event) => setRemote(event.target.checked)
											}), /* @__PURE__ */ jsx("label", {
												className: "form-check-label small fw-semibold",
												htmlFor: "job-remote",
												children: "Remote only"
											})]
										}),
										/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
											className: "rt-filter-label mb-2",
											children: "Employment type"
										}), /* @__PURE__ */ jsx("div", {
											className: "d-flex flex-wrap gap-1",
											children: ["", ...EMPLOYMENT_TYPES$1].map((type) => /* @__PURE__ */ jsx("button", {
												type: "button",
												className: `rt-filter-pill ${employmentType === type ? "is-active" : ""}`,
												onClick: () => setEmploymentType(type),
												children: type ? label$1(type) : "Any"
											}, type || "any"))
										})] }),
										/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
											className: "rt-filter-label mb-2",
											children: "Salary range"
										}), /* @__PURE__ */ jsxs("div", {
											className: "d-flex align-items-center gap-2",
											children: [
												/* @__PURE__ */ jsx("input", {
													"aria-label": "Minimum salary",
													type: "number",
													min: "0",
													className: "form-control form-control-sm rt-input",
													value: salaryMin,
													onChange: (event) => setSalaryMin(event.target.value),
													placeholder: "Min"
												}),
												/* @__PURE__ */ jsx("span", {
													className: "text-muted",
													children: "–"
												}),
												/* @__PURE__ */ jsx("input", {
													"aria-label": "Maximum salary",
													type: "number",
													min: "0",
													className: "form-control form-control-sm rt-input",
													value: salaryMax,
													onChange: (event) => setSalaryMax(event.target.value),
													placeholder: "Max"
												})
											]
										})] }),
										/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
											className: "rt-filter-label d-block mb-2",
											htmlFor: "job-posted",
											children: "Date posted"
										}), /* @__PURE__ */ jsxs("select", {
											id: "job-posted",
											className: "form-select form-select-sm rt-input",
											value: postedWithin,
											onChange: (event) => setPostedWithin(event.target.value),
											children: [/* @__PURE__ */ jsx("option", {
												value: "",
												children: "Any time"
											}), POSTED_WITHIN.map((days) => /* @__PURE__ */ jsx("option", {
												value: days,
												children: days === 1 ? "Last 24 hours" : `Last ${days} days`
											}, days))]
										})] }),
										/* @__PURE__ */ jsxs("button", {
											className: "btn rt-btn-soft",
											type: "submit",
											children: [/* @__PURE__ */ jsx("i", { className: "bi bi-funnel me-1" }), "Apply filters"]
										})
									]
								})]
							}),
							canSaveSearch ? /* @__PURE__ */ jsxs("section", {
								className: "rt-card p-4",
								children: [
									/* @__PURE__ */ jsxs("h2", {
										className: "rt-card-title mb-1",
										children: [/* @__PURE__ */ jsx("i", { className: "bi bi-bell" }), "Job alerts"]
									}),
									/* @__PURE__ */ jsx("p", {
										className: "text-muted small mb-3",
										children: "Save this search and get an email when new jobs match your CV."
									}),
									/* @__PURE__ */ jsxs("form", {
										onSubmit: saveSearch,
										className: "d-grid gap-2",
										children: [
											/* @__PURE__ */ jsx("input", {
												"aria-label": "Search name",
												className: "form-control form-control-sm rt-input",
												value: searchName,
												onChange: (event) => setSearchName(event.target.value),
												placeholder: "e.g. Remote Laravel roles"
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "d-flex align-items-center gap-2 small",
												children: [/* @__PURE__ */ jsx("label", {
													htmlFor: "saved-search-score",
													className: "text-muted text-nowrap",
													children: "Min. match"
												}), /* @__PURE__ */ jsxs("div", {
													className: "input-group input-group-sm",
													children: [/* @__PURE__ */ jsx("input", {
														id: "saved-search-score",
														type: "number",
														min: "0",
														max: "100",
														className: "form-control rt-input",
														value: saveMinScore,
														onChange: (event) => setSaveMinScore(event.target.value)
													}), /* @__PURE__ */ jsx("span", {
														className: "input-group-text",
														children: "%"
													})]
												})]
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "form-check small",
												children: [/* @__PURE__ */ jsx("input", {
													id: "saved-search-alerts",
													className: "form-check-input",
													type: "checkbox",
													checked: saveAlerts,
													onChange: (event) => setSaveAlerts(event.target.checked)
												}), /* @__PURE__ */ jsx("label", {
													className: "form-check-label",
													htmlFor: "saved-search-alerts",
													children: "Email me new matches"
												})]
											}),
											/* @__PURE__ */ jsxs("button", {
												type: "submit",
												className: "btn btn-sm rt-btn-soft",
												disabled: !searchName.trim(),
												children: [/* @__PURE__ */ jsx("i", { className: "bi bi-bookmark-plus me-1" }), "Save search"]
											})
										]
									})
								]
							}) : /* @__PURE__ */ jsxs("section", {
								className: "rt-card p-4 text-center",
								children: [
									/* @__PURE__ */ jsx("i", {
										className: "bi bi-bell fs-4",
										style: { color: "var(--rt-primary)" }
									}),
									/* @__PURE__ */ jsx("h2", {
										className: "h6 fw-bold mt-2 mb-1",
										children: "Get job alerts"
									}),
									/* @__PURE__ */ jsx("p", {
										className: "text-muted small mb-3",
										children: "Create a free account to save searches and get emailed new matches."
									}),
									/* @__PURE__ */ jsx(Link, {
										href: "/register",
										className: "btn btn-sm rt-btn-primary px-3",
										children: "Sign up free"
									})
								]
							})
						]
					}), /* @__PURE__ */ jsxs("div", {
						className: "col-lg-8 col-xl-9 order-1 order-lg-2",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "rt-card rt-jobs-toolbar mb-3",
								children: [/* @__PURE__ */ jsxs("div", { children: [
									/* @__PURE__ */ jsx("span", {
										className: "fw-bold",
										children: jobs.total.toLocaleString()
									}),
									" job",
									jobs.total === 1 ? "" : "s",
									!hasCv && /* @__PURE__ */ jsxs("a", {
										href: "#your-cv",
										className: "small ms-2",
										children: [/* @__PURE__ */ jsx("i", { className: "bi bi-info-circle me-1" }), "Upload your CV to see match scores"]
									})
								] }), /* @__PURE__ */ jsxs("div", {
									className: "d-flex align-items-center gap-2",
									children: [/* @__PURE__ */ jsx("label", {
										htmlFor: "job-sort",
										className: "small text-muted text-nowrap",
										children: "Sort by"
									}), /* @__PURE__ */ jsxs("select", {
										id: "job-sort",
										className: "form-select form-select-sm",
										value: sort,
										onChange: (event) => changeSort(event.target.value),
										children: [
											/* @__PURE__ */ jsx("option", {
												value: "newest",
												children: "Newest"
											}),
											/* @__PURE__ */ jsx("option", {
												value: "match",
												children: "Best match"
											}),
											/* @__PURE__ */ jsx("option", {
												value: "company",
												children: "Company"
											})
										]
									})]
								})]
							}),
							activeFilters.length > 0 && /* @__PURE__ */ jsxs("div", {
								className: "d-flex flex-wrap gap-2 mb-3",
								children: [activeFilters.map((filter) => /* @__PURE__ */ jsxs("button", {
									type: "button",
									className: "rt-active-filter",
									onClick: filter.clear,
									title: "Remove filter",
									children: [
										filter.icon && /* @__PURE__ */ jsx("i", { className: `bi ${filter.icon}` }),
										/* @__PURE__ */ jsx("span", {
											className: "text-capitalize",
											children: filter.label
										}),
										/* @__PURE__ */ jsx("i", { className: "bi bi-x" })
									]
								}, filter.key)), /* @__PURE__ */ jsx(Link, {
									href: "/jobs",
									className: "small align-self-center ms-1",
									children: "Clear all"
								})]
							}),
							/* @__PURE__ */ jsx(StatusBanner, { status }),
							jobs.data.length === 0 ? /* @__PURE__ */ jsxs("section", {
								className: "rt-card p-5 text-center",
								children: [
									/* @__PURE__ */ jsx("span", {
										className: "rt-stat-icon rt-tone-indigo mx-auto mb-3",
										children: /* @__PURE__ */ jsx("i", { className: "bi bi-search" })
									}),
									/* @__PURE__ */ jsx("h3", {
										className: "h6 fw-bold",
										children: "No jobs match these filters"
									}),
									/* @__PURE__ */ jsx("p", {
										className: "text-muted small mb-3",
										children: "Try a broader keyword, clear the location, or remove a filter."
									}),
									/* @__PURE__ */ jsx(Link, {
										href: "/jobs",
										className: "btn btn-sm btn-light border",
										children: "Show all jobs"
									})
								]
							}) : /* @__PURE__ */ jsx("div", {
								className: "d-grid gap-3",
								children: jobs.data.map((job) => /* @__PURE__ */ jsxs("article", {
									className: "rt-card rt-job-row",
									children: [
										/* @__PURE__ */ jsx("span", {
											className: `rt-company-avatar rt-tone-${avatarTone(job.company || job.title)}`,
											"aria-hidden": "true",
											children: (job.company || job.title || "?").trim().charAt(0).toUpperCase()
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "flex-grow-1 min-w-0",
											children: [
												/* @__PURE__ */ jsx("h3", {
													className: "rt-job-title",
													children: /* @__PURE__ */ jsx(Link, {
														href: job.url,
														children: job.title
													})
												}),
												/* @__PURE__ */ jsxs("div", {
													className: "rt-job-sub",
													children: [job.company && /* @__PURE__ */ jsx("span", {
														className: "fw-semibold",
														children: job.company
													}), job.location && /* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("i", { className: "bi bi-geo-alt" }), job.location] })]
												}),
												/* @__PURE__ */ jsxs("div", {
													className: "rt-job-tags",
													children: [
														job.is_remote && /* @__PURE__ */ jsxs("span", {
															className: "rt-job-tag is-remote",
															children: [/* @__PURE__ */ jsx("i", { className: "bi bi-house-door" }), "Remote"]
														}),
														job.employment_type && /* @__PURE__ */ jsx("span", {
															className: "rt-job-tag text-capitalize",
															children: label$1(job.employment_type)
														}),
														formatSalary$1(job) && /* @__PURE__ */ jsxs("span", {
															className: "rt-job-tag",
															children: [/* @__PURE__ */ jsx("i", { className: "bi bi-cash-stack" }), formatSalary$1(job)]
														}),
														timeAgo(job.posted_at) && /* @__PURE__ */ jsxs("span", {
															className: "rt-job-tag",
															children: [/* @__PURE__ */ jsx("i", { className: "bi bi-clock" }), timeAgo(job.posted_at)]
														}),
														/* @__PURE__ */ jsx("span", {
															className: "rt-job-tag text-uppercase",
															children: job.source
														})
													]
												}),
												job.match && /* @__PURE__ */ jsxs("div", {
													className: "rt-job-match",
													children: [
														/* @__PURE__ */ jsxs("span", {
															className: "text-success",
															children: [
																/* @__PURE__ */ jsx("i", { className: "bi bi-check-circle-fill" }),
																job.match.matched_count,
																" matched"
															]
														}),
														/* @__PURE__ */ jsxs("span", {
															className: "text-danger",
															children: [
																/* @__PURE__ */ jsx("i", { className: "bi bi-x-circle-fill" }),
																job.match.missing_count,
																" missing"
															]
														}),
														job.match.required_total > 0 && /* @__PURE__ */ jsxs("span", {
															className: "text-muted",
															children: [
																job.match.required_matched,
																"/",
																job.match.required_total,
																" required"
															]
														})
													]
												})
											]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "rt-job-side",
											children: [job.match ? /* @__PURE__ */ jsx(MatchRing, { match: job.match }) : /* @__PURE__ */ jsx("span", {}), /* @__PURE__ */ jsxs("div", {
												className: "d-flex gap-2",
												children: [/* @__PURE__ */ jsxs("button", {
													type: "button",
													className: `btn btn-sm ${job.saved ? "btn-primary" : "btn-light border"}`,
													onClick: () => toggleSaved(job),
													title: job.saved ? "Remove from saved jobs" : "Save this job",
													children: [/* @__PURE__ */ jsx("i", { className: `bi ${job.saved ? "bi-bookmark-fill" : "bi-bookmark"}` }), /* @__PURE__ */ jsx("span", {
														className: "visually-hidden",
														children: job.saved ? "Unsave job" : "Save job"
													})]
												}), /* @__PURE__ */ jsxs(Link, {
													href: job.url,
													className: "btn btn-sm rt-btn-soft text-nowrap",
													children: ["View ", /* @__PURE__ */ jsx("i", { className: "bi bi-arrow-right ms-1" })]
												})]
											})]
										})
									]
								}, job.id))
							}),
							jobs.last_page > 1 && /* @__PURE__ */ jsxs("nav", {
								className: "d-flex justify-content-between align-items-center mt-4",
								"aria-label": "Job pagination",
								children: [
									jobs.prev_page_url ? /* @__PURE__ */ jsxs(Link, {
										href: jobs.prev_page_url,
										className: "btn btn-sm btn-light border",
										preserveScroll: false,
										children: [/* @__PURE__ */ jsx("i", { className: "bi bi-arrow-left me-1" }), "Previous"]
									}) : /* @__PURE__ */ jsx("span", {}),
									/* @__PURE__ */ jsxs("span", {
										className: "text-muted small",
										children: [
											"Page ",
											jobs.current_page,
											" of ",
											jobs.last_page
										]
									}),
									jobs.next_page_url ? /* @__PURE__ */ jsxs(Link, {
										href: jobs.next_page_url,
										className: "btn btn-sm btn-light border",
										preserveScroll: false,
										children: ["Next", /* @__PURE__ */ jsx("i", { className: "bi bi-arrow-right ms-1" })]
									}) : /* @__PURE__ */ jsx("span", {})
								]
							})
						]
					})]
				})
			})
		]
	});
}
//#endregion
//#region resources/js/Components/TailorUi.jsx
var BREAKDOWN_ORDER$1 = [
	"keywords",
	"job_title",
	"sections",
	"contact"
];
var scoreTone$1 = (score) => score >= 75 ? "success" : score >= 50 ? "warning" : "danger";
var toneColor$1 = {
	success: "var(--rt-success)",
	warning: "var(--rt-warning)",
	danger: "var(--rt-danger)"
};
var errorMessage = (err, fallback) => {
	const errors = err?.response?.data?.errors;
	if (errors) return Object.values(errors).flat()[0];
	if (err?.response?.status === 429) return "Too many requests. Please wait a minute and try again.";
	if (!err?.response) {
		console.error("Tailor request failed without a server response", err);
		return err?.request ? "No response from the server. Check that the app is still running and try again." : "Something went wrong while showing the result. Please reload the page and try again.";
	}
	return err?.response?.data?.message || err?.message || fallback;
};
function ScoreGauge({ score, caption }) {
	const radius = 52;
	const circumference = 2 * Math.PI * radius;
	const [shown, setShown] = useState(0);
	useEffect(() => {
		const frame = requestAnimationFrame(() => setShown(score));
		return () => cancelAnimationFrame(frame);
	}, [score]);
	return /* @__PURE__ */ jsxs("div", {
		className: "rt-gauge",
		children: [/* @__PURE__ */ jsxs("svg", {
			viewBox: "0 0 120 120",
			role: "img",
			"aria-label": `${caption}: ${score}%`,
			children: [/* @__PURE__ */ jsx("circle", {
				className: "rt-gauge-track",
				cx: "60",
				cy: "60",
				r: radius,
				fill: "none",
				strokeWidth: "10"
			}), /* @__PURE__ */ jsx("circle", {
				className: "rt-gauge-value",
				cx: "60",
				cy: "60",
				r: radius,
				fill: "none",
				strokeWidth: "10",
				strokeLinecap: "round",
				stroke: toneColor$1[scoreTone$1(score)],
				strokeDasharray: circumference,
				strokeDashoffset: circumference * (1 - shown / 100)
			})]
		}), /* @__PURE__ */ jsxs("div", {
			className: "rt-gauge-label",
			children: [/* @__PURE__ */ jsxs("span", {
				className: "rt-gauge-number",
				style: { color: toneColor$1[scoreTone$1(score)] },
				children: [score, "%"]
			}), /* @__PURE__ */ jsx("span", {
				className: "rt-gauge-caption",
				children: caption
			})]
		})]
	});
}
function Bar({ value, variant }) {
	const [width, setWidth] = useState(0);
	useEffect(() => {
		const frame = requestAnimationFrame(() => setWidth(value));
		return () => cancelAnimationFrame(frame);
	}, [value]);
	return /* @__PURE__ */ jsx("div", {
		className: `rt-bar ${variant === "before" ? "rt-bar-before" : ""}`,
		children: /* @__PURE__ */ jsx("span", { style: {
			width: `${width}%`,
			background: variant === "before" ? void 0 : toneColor$1[scoreTone$1(value)]
		} })
	});
}
var SERIF_FONTS = [
	"Times New Roman",
	"Caladea",
	"PT Serif",
	"IBM Plex Serif",
	"Crimson Text"
];
/**
* Miniature page for a template, drawn from the preview data the server sends with each template:
* typeface, name alignment and colour, heading style and density.
*/
function TemplateThumb({ preview }) {
	if (!preview) return /* @__PURE__ */ jsx("span", {
		className: "rt-thumb is-original",
		"aria-hidden": "true",
		children: /* @__PURE__ */ jsx("i", { className: "bi bi-file-earmark-person" })
	});
	const fallback = SERIF_FONTS.includes(preview.font) ? "Georgia, serif" : "Helvetica, Arial, sans-serif";
	return /* @__PURE__ */ jsxs("span", {
		className: `rt-thumb ${preview.dense ? "is-dense" : ""}`,
		style: {
			"--thumb-accent": preview.heading_color,
			"--thumb-name": preview.name_color
		},
		"aria-hidden": "true",
		children: [/* @__PURE__ */ jsx("span", {
			className: `rt-thumb-name ${preview.name_uppercase ? "is-upper" : ""}`,
			style: {
				textAlign: preview.align,
				fontFamily: `"${preview.font}", ${fallback}`
			},
			children: "Jane Doe"
		}), [0, 1].map((section) => /* @__PURE__ */ jsxs(React.Fragment, { children: [
			/* @__PURE__ */ jsx("span", { className: `rt-thumb-heading is-${preview.heading_style}` }),
			/* @__PURE__ */ jsx("span", { className: "rt-thumb-line" }),
			/* @__PURE__ */ jsx("span", { className: "rt-thumb-line is-short" })
		] }, section))]
	});
}
function TemplatePicker({ templates, value, onChange, disabled = false, label, locked = false }) {
	const categories = useMemo(() => ["All", ...new Set(templates.map((template) => template.category).filter((category) => category !== "Your CV"))], [templates]);
	const [category, setCategory] = useState("All");
	const shown = templates.filter((template) => category === "All" || template.category === category || template.value === "original");
	return /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
		className: "rt-tabs rt-template-tabs mb-2",
		role: "tablist",
		"aria-label": `${label} categories`,
		children: categories.map((name) => /* @__PURE__ */ jsxs("button", {
			type: "button",
			role: "tab",
			"aria-selected": category === name,
			className: `rt-tab ${category === name ? "is-active" : ""}`,
			onClick: () => setCategory(name),
			children: [name, /* @__PURE__ */ jsx("span", {
				className: "rt-count",
				children: name === "All" ? templates.length : templates.filter((template) => template.category === name).length
			})]
		}, name))
	}), /* @__PURE__ */ jsx("div", {
		className: "rt-templates",
		role: "radiogroup",
		"aria-label": label,
		children: shown.map((template) => /* @__PURE__ */ jsxs("button", {
			type: "button",
			role: "radio",
			"aria-checked": value === template.value,
			className: `rt-template ${value === template.value ? "is-active" : ""}`,
			onClick: () => onChange(template.value),
			disabled,
			title: template.premium && locked ? `${template.description} (Pro)` : template.description,
			children: [
				/* @__PURE__ */ jsx(TemplateThumb, { preview: template.preview }),
				/* @__PURE__ */ jsxs("span", {
					className: "rt-template-label",
					children: [template.label, template.premium && locked && /* @__PURE__ */ jsx("i", {
						className: "bi bi-lock-fill ms-1 text-muted",
						"aria-label": "Pro design"
					})]
				}),
				/* @__PURE__ */ jsx("span", {
					className: "rt-template-desc",
					children: template.description
				})
			]
		}, template.value))
	})] });
}
function Chip({ keyword, tone, title }) {
	return /* @__PURE__ */ jsx("span", {
		className: `rt-chip rt-chip-${tone} ${keyword.importance === "required" ? "rt-chip-required" : ""}`,
		title,
		children: keyword.term
	});
}
var STATUS_ICONS = {
	pass: "bi-check-circle-fill text-success",
	warn: "bi-exclamation-circle-fill text-warning",
	fail: "bi-x-circle-fill text-danger"
};
var CATEGORY_LABELS = {
	hard_skill: "Hard skills",
	tool: "Tools",
	soft_skill: "Soft skills",
	certification: "Certifications",
	education: "Education",
	job_title: "Job title"
};
/**
* One row per scoring check: whether it passes, why, how to fix it and how many points the fix is worth.
*/
function ScoreChecklist({ breakdown }) {
	return /* @__PURE__ */ jsx("ul", {
		className: "list-unstyled d-grid gap-3 mb-0",
		children: BREAKDOWN_ORDER$1.filter((key) => breakdown[key]).map((key) => {
			const check = breakdown[key];
			return /* @__PURE__ */ jsxs("li", {
				className: "d-flex gap-3 align-items-start",
				children: [/* @__PURE__ */ jsx("i", {
					className: `bi ${STATUS_ICONS[check.status] ?? STATUS_ICONS.warn} fs-5`,
					"aria-label": check.status
				}), /* @__PURE__ */ jsxs("div", {
					className: "flex-grow-1",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "d-flex justify-content-between gap-2",
							children: [/* @__PURE__ */ jsxs("span", {
								className: "fw-semibold",
								children: [
									check.label,
									" ",
									/* @__PURE__ */ jsxs("span", {
										className: "rt-weight ms-1",
										children: [check.weight, "%"]
									})
								]
							}), /* @__PURE__ */ jsxs("span", {
								className: "small fw-semibold text-nowrap",
								style: { color: toneColor$1[scoreTone$1(check.score)] },
								children: [check.score, "/100"]
							})]
						}),
						/* @__PURE__ */ jsx("small", {
							className: "text-muted d-block",
							children: check.detail
						}),
						check.tip && /* @__PURE__ */ jsxs("small", {
							className: "d-block mt-1",
							children: [
								/* @__PURE__ */ jsx("i", { className: "bi bi-lightbulb me-1 text-warning" }),
								check.tip,
								check.gain > 0 && /* @__PURE__ */ jsxs("span", {
									className: "badge rounded-pill text-bg-light border ms-2",
									children: [
										"up to +",
										check.gain,
										" pts"
									]
								})
							]
						})
					]
				})]
			}, key);
		})
	});
}
/**
* Placeholder words for the blurred chips. They only give each chip a believable width: the real
* hidden keywords are never sent to the browser (only how many there are), so un-blurring reveals nothing.
*/
var PLACEHOLDER_WORDS = [
	"Placeholder",
	"Hidden skill",
	"Locked",
	"Keyword",
	"Pro only",
	"Hidden tool",
	"Locked skill",
	"Keyword item"
];
var MAX_BLURRED_CHIPS = 12;
/**
* The missing keywords the Free plan hides, drawn as blurred chips under a "Go Pro" note.
*/
function HiddenKeywordsNotice({ count }) {
	if (!count) return null;
	const chips = Array.from({ length: Math.min(count, MAX_BLURRED_CHIPS) }, (_, index) => PLACEHOLDER_WORDS[index % PLACEHOLDER_WORDS.length]);
	return /* @__PURE__ */ jsxs("div", {
		className: "rt-locked mt-3",
		children: [/* @__PURE__ */ jsx("div", {
			className: "rt-locked-chips",
			"aria-hidden": "true",
			children: chips.map((word, index) => /* @__PURE__ */ jsx("span", {
				className: "rt-chip rt-chip-danger",
				children: word
			}, index))
		}), /* @__PURE__ */ jsxs("div", {
			className: "rt-locked-overlay",
			children: [
				/* @__PURE__ */ jsx("span", {
					className: "rt-upgrade-icon",
					children: /* @__PURE__ */ jsx("i", { className: "bi bi-lock-fill" })
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "fw-semibold",
					children: [
						"+",
						count,
						" more missing keyword",
						count === 1 ? "" : "s"
					]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "text-muted small mb-2",
					children: "Go Pro to see all missing keywords and add the ones you have."
				}),
				/* @__PURE__ */ jsxs(Link, {
					href: "/pricing",
					className: "btn btn-sm rt-btn-primary px-3 py-1",
					children: [/* @__PURE__ */ jsx("i", { className: "bi bi-lightning-charge-fill me-1" }), "Go Pro to see all"]
				})
			]
		})]
	});
}
/**
* Job keywords grouped by kind (hard skills, tools, soft skills...), found ones green and missing ones red.
*/
function KeywordGroups({ matched, missing, hiddenCount = 0 }) {
	const groups = useMemo(() => {
		const byCategory = {};
		[...matched.map((keyword) => ({
			...keyword,
			found: true
		})), ...missing.map((keyword) => ({
			...keyword,
			found: false
		}))].forEach((keyword) => {
			const category = CATEGORY_LABELS[keyword.category] ? keyword.category : "hard_skill";
			(byCategory[category] ??= []).push(keyword);
		});
		return Object.keys(CATEGORY_LABELS).filter((category) => byCategory[category]).map((category) => [category, byCategory[category]]);
	}, [matched, missing]);
	return /* @__PURE__ */ jsxs("div", {
		className: "d-grid gap-3",
		children: [groups.map(([category, keywords]) => /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("div", {
			className: "small fw-semibold mb-2",
			children: [
				CATEGORY_LABELS[category],
				" ",
				/* @__PURE__ */ jsxs("span", {
					className: "text-muted fw-normal",
					children: [keywords.filter((keyword) => keyword.found).length, " found"]
				})
			]
		}), /* @__PURE__ */ jsx("div", {
			className: "d-flex flex-wrap gap-2",
			children: keywords.map((keyword) => /* @__PURE__ */ jsx(Chip, {
				keyword,
				tone: keyword.found ? keyword.in_context === false ? "warning" : "success" : "danger",
				title: keyword.found ? keyword.in_context === false ? "Only in your skills list" : "Found" : "Missing"
			}, keyword.term))
		})] }, category)), /* @__PURE__ */ jsx(HiddenKeywordsNotice, { count: hiddenCount })]
	});
}
function UpgradeNotice({ upgrade, onClose, innerRef }) {
	return /* @__PURE__ */ jsxs("div", {
		ref: innerRef,
		className: "rt-upgrade mb-3 rt-fade-in",
		role: "alert",
		children: [
			/* @__PURE__ */ jsx("span", {
				className: "rt-upgrade-icon",
				children: /* @__PURE__ */ jsx("i", { className: "bi bi-stars" })
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "flex-grow-1 small",
				children: [
					/* @__PURE__ */ jsx("div", {
						className: "fw-semibold mb-1",
						children: upgrade.url ? "This is a Pro feature" : "Monthly limit reached"
					}),
					/* @__PURE__ */ jsx("div", {
						className: "text-muted",
						children: upgrade.message
					}),
					upgrade.url && /* @__PURE__ */ jsxs(Link, {
						href: upgrade.url,
						className: "btn btn-sm rt-btn-primary mt-2 px-3 py-1",
						children: [/* @__PURE__ */ jsx("i", { className: "bi bi-lightning-charge-fill me-1" }), "See Pro plans"]
					})
				]
			}),
			/* @__PURE__ */ jsx("button", {
				type: "button",
				className: "btn-close",
				"aria-label": "Close",
				onClick: onClose
			})
		]
	});
}
/**
* How much of this month's tailoring quota is used, with a way to upgrade when it runs out.
*/
function UsageMeter({ billing }) {
	if (!billing) return null;
	if (billing.plan === "pro") return /* @__PURE__ */ jsxs("div", {
		className: "rt-usage d-flex align-items-center gap-2 small mt-3",
		children: [/* @__PURE__ */ jsxs("span", {
			className: "rt-plan-pill",
			children: [/* @__PURE__ */ jsx("i", { className: "bi bi-stars" }), "Pro"]
		}), /* @__PURE__ */ jsxs("span", {
			className: "text-muted",
			children: [billing.remaining === null ? "Unlimited tailored CVs" : `${billing.remaining} tailored CVs left this month`, " · all designs unlocked"]
		})]
	});
	const used = Math.min(billing.used, billing.limit);
	const isEmpty = billing.remaining === 0;
	const resetsOn = (/* @__PURE__ */ new Date(`${billing.resets_at}T00:00:00`)).toLocaleDateString(void 0, {
		day: "numeric",
		month: "short"
	});
	return /* @__PURE__ */ jsxs("div", {
		className: `rt-usage small mt-3 ${isEmpty ? "is-empty" : ""}`,
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "d-flex justify-content-between align-items-center gap-2 mb-2",
				children: [/* @__PURE__ */ jsxs("span", {
					className: "fw-semibold",
					children: [
						"Free plan · ",
						billing.remaining,
						" of ",
						billing.limit,
						" tailored CV",
						billing.limit === 1 ? "" : "s",
						" left"
					]
				}), /* @__PURE__ */ jsxs(Link, {
					href: "/pricing",
					className: "fw-semibold text-decoration-none text-nowrap",
					children: [/* @__PURE__ */ jsx("i", { className: "bi bi-lightning-charge-fill me-1" }), "Go Pro"]
				})]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "rt-usage-bar",
				role: "progressbar",
				"aria-valuemin": 0,
				"aria-valuemax": billing.limit,
				"aria-valuenow": used,
				"aria-label": "Tailored CVs used this month",
				children: /* @__PURE__ */ jsx("span", { style: { width: `${billing.limit > 0 ? used / billing.limit * 100 : 0}%` } })
			}),
			/* @__PURE__ */ jsx("div", {
				className: "text-muted mt-2",
				children: isEmpty ? `Resets on ${resetsOn}. ATS score checks stay free and unlimited.` : "ATS score checks are free and unlimited."
			})
		]
	});
}
//#endregion
//#region resources/js/Pages/Jobs/Show.jsx
var Show_exports = /* @__PURE__ */ __exportAll({ default: () => JobShow });
var BREAKDOWN_ORDER = [
	"keywords",
	"job_title",
	"sections",
	"contact"
];
var scoreTone = (score) => score >= 75 ? "success" : score >= 50 ? "warning" : "danger";
var toneColor = {
	success: "var(--rt-success)",
	warning: "var(--rt-warning)",
	danger: "var(--rt-danger)"
};
var formatDate$4 = (value) => {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString(void 0, {
		year: "numeric",
		month: "short",
		day: "numeric"
	});
};
var formatSalary = (job) => {
	if (!job.salary_min && !job.salary_max) return null;
	const amount = (value) => value?.toLocaleString();
	const currency = job.currency ? `${job.currency} ` : "";
	if (job.salary_min && job.salary_max) return `${currency}${amount(job.salary_min)} - ${amount(job.salary_max)}`;
	return `${currency}${amount(job.salary_min || job.salary_max)}`;
};
function MatchPanel({ match, backUrl }) {
	if (!match) return /* @__PURE__ */ jsxs("section", {
		className: "rt-card p-4 h-100",
		children: [
			/* @__PURE__ */ jsxs("h2", {
				className: "rt-card-title mb-2",
				children: [/* @__PURE__ */ jsx("i", { className: "bi bi-speedometer2" }), "Your match"]
			}),
			/* @__PURE__ */ jsx("p", {
				className: "text-muted small mb-3",
				children: "Upload your CV on the jobs page to see how well you match this role before you apply."
			}),
			/* @__PURE__ */ jsxs(Link, {
				href: backUrl,
				className: "btn rt-btn-primary w-100",
				children: [/* @__PURE__ */ jsx("i", { className: "bi bi-radar me-2" }), "Scan this job"]
			})
		]
	});
	const tone = scoreTone(match.score);
	return /* @__PURE__ */ jsx("section", {
		className: "rt-card h-100",
		children: /* @__PURE__ */ jsxs("div", {
			className: "p-4 rt-card-body",
			children: [
				/* @__PURE__ */ jsxs("h2", {
					className: "rt-card-title mb-3",
					children: [/* @__PURE__ */ jsx("i", { className: "bi bi-speedometer2" }), "Your match"]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "d-flex align-items-center gap-3 mb-3",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "rt-match-score",
						style: { color: toneColor[tone] },
						children: [match.score, /* @__PURE__ */ jsx("span", { children: "%" })]
					}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("div", {
						className: "fw-semibold",
						children: [
							match.matched_count,
							" of ",
							match.matched_count + match.missing_count,
							" keywords"
						]
					}), /* @__PURE__ */ jsx("div", {
						className: "text-muted small",
						children: match.required_total > 0 ? `${match.required_matched}/${match.required_total} required keywords matched` : "No required keywords identified"
					})] })]
				}),
				match.breakdown && Object.keys(match.breakdown).length > 0 && /* @__PURE__ */ jsx("div", {
					className: "mb-3",
					children: BREAKDOWN_ORDER.filter((key) => match.breakdown[key]).map((key) => {
						const metric = match.breakdown[key];
						const metricTone = scoreTone(metric.score);
						return /* @__PURE__ */ jsxs("div", {
							className: "rt-metric",
							children: [
								/* @__PURE__ */ jsxs("div", {
									className: "d-flex justify-content-between align-items-center mb-1 gap-2",
									children: [/* @__PURE__ */ jsxs("span", {
										className: "fw-semibold small",
										children: [
											metric.label,
											" ",
											/* @__PURE__ */ jsxs("span", {
												className: "rt-weight ms-1",
												children: [metric.weight, "%"]
											})
										]
									}), /* @__PURE__ */ jsx("span", {
										className: "small fw-semibold",
										style: { color: toneColor[metricTone] },
										children: metric.score
									})]
								}),
								/* @__PURE__ */ jsx("div", {
									className: "rt-bar",
									children: /* @__PURE__ */ jsx("span", { style: {
										width: `${metric.score}%`,
										background: toneColor[metricTone]
									} })
								}),
								/* @__PURE__ */ jsx("small", {
									className: "text-muted d-block mt-1",
									children: metric.detail
								})
							]
						}, key);
					})
				}),
				match.matched?.length > 0 && /* @__PURE__ */ jsxs("div", {
					className: "mb-3",
					children: [/* @__PURE__ */ jsx("div", {
						className: "rt-filter-label mb-2",
						children: "Matched keywords"
					}), /* @__PURE__ */ jsx("div", {
						className: "d-flex flex-wrap gap-2",
						children: match.matched.map((keyword) => /* @__PURE__ */ jsx("span", {
							className: `rt-chip rt-chip-success ${keyword.importance === "required" ? "rt-chip-required" : ""}`,
							children: keyword.term
						}, keyword.term))
					})]
				}),
				match.missing?.length > 0 && /* @__PURE__ */ jsxs("div", { children: [
					/* @__PURE__ */ jsx("div", {
						className: "rt-filter-label mb-2",
						children: "Missing keywords"
					}),
					/* @__PURE__ */ jsx("div", {
						className: "d-flex flex-wrap gap-2",
						children: match.missing.map((keyword) => /* @__PURE__ */ jsx("span", {
							className: `rt-chip rt-chip-danger ${keyword.importance === "required" ? "rt-chip-required" : ""}`,
							children: keyword.term
						}, keyword.term))
					}),
					/* @__PURE__ */ jsx(HiddenKeywordsNotice, { count: match.missing_hidden ?? 0 })
				] })
			]
		})
	});
}
function JobShow({ job, match, tailorUrl, backUrl, seo }) {
	const user = usePage().props.auth?.user;
	const tone = match ? scoreTone(match.score) : "muted";
	const salary = formatSalary(job);
	const posted = formatDate$4(job.posted_at);
	const toggleSaved = () => {
		if (!user) {
			router.get("/login");
			return;
		}
		if (job.saved) router.delete(`/saved-jobs/${job.saved.id}`, { preserveScroll: true });
		else router.post(`/jobs/${job.id}/save`, {}, { preserveScroll: true });
	};
	return /* @__PURE__ */ jsxs(MainLayout, {
		seo,
		children: [/* @__PURE__ */ jsx(NavBar, {}), /* @__PURE__ */ jsxs("div", {
			className: "container py-4 py-lg-5",
			children: [
				/* @__PURE__ */ jsxs(Link, {
					href: backUrl,
					className: "rt-nav-link d-inline-flex align-items-center gap-1 mb-3",
					children: [/* @__PURE__ */ jsx("i", { className: "bi bi-arrow-left" }), " All jobs"]
				}),
				/* @__PURE__ */ jsx("section", {
					className: "rt-card p-4 p-lg-5 mb-4",
					children: /* @__PURE__ */ jsxs("div", {
						className: "d-flex flex-column flex-lg-row justify-content-between gap-4",
						children: [/* @__PURE__ */ jsxs("div", { children: [
							/* @__PURE__ */ jsxs("div", {
								className: "d-flex flex-wrap align-items-center gap-2 mb-2",
								children: [
									/* @__PURE__ */ jsxs("span", {
										className: `rt-job-score rt-job-score-${tone} rt-job-score-inline`,
										children: [match ? match.score : "—", /* @__PURE__ */ jsx("small", { children: match ? "match" : "n/a" })]
									}),
									/* @__PURE__ */ jsx("span", {
										className: "badge text-bg-light border text-uppercase",
										children: job.source
									}),
									job.is_remote && /* @__PURE__ */ jsx("span", {
										className: "badge text-bg-success",
										children: "Remote"
									})
								]
							}),
							/* @__PURE__ */ jsx("h1", {
								className: "h3 fw-bold mb-1",
								children: job.title
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "rt-job-meta",
								children: [
									job.company && /* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("i", { className: "bi bi-building" }), job.company] }),
									job.location && /* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("i", { className: "bi bi-geo-alt" }), job.location] }),
									job.employment_type && /* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("i", { className: "bi bi-clock-history" }), job.employment_type.replace("_", " ")] }),
									posted && /* @__PURE__ */ jsxs("span", { children: [
										/* @__PURE__ */ jsx("i", { className: "bi bi-calendar3" }),
										"Posted ",
										posted
									] }),
									salary && /* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("i", { className: "bi bi-cash" }), salary] })
								]
							})
						] }), /* @__PURE__ */ jsxs("div", {
							className: "d-flex flex-column gap-2 flex-shrink-0",
							style: { minWidth: "14rem" },
							children: [
								/* @__PURE__ */ jsxs("a", {
									href: job.apply_url,
									target: "_blank",
									rel: "noopener noreferrer",
									className: "btn btn-success rt-btn-success",
									children: [
										/* @__PURE__ */ jsx("i", { className: "bi bi-box-arrow-up-right me-2" }),
										"Apply on ",
										job.source
									]
								}),
								/* @__PURE__ */ jsxs("small", {
									className: "text-muted text-center",
									style: { maxWidth: "14rem" },
									children: [
										"Listing from ",
										job.source,
										". Check the details on the original posting."
									]
								}),
								/* @__PURE__ */ jsxs(Link, {
									href: tailorUrl,
									className: "btn rt-btn-primary",
									children: [/* @__PURE__ */ jsx("i", { className: "bi bi-magic me-2" }), "Tailor my resume"]
								}),
								/* @__PURE__ */ jsxs("button", {
									type: "button",
									className: `btn ${job.saved ? "btn-primary" : "btn-outline-secondary"}`,
									onClick: toggleSaved,
									children: [/* @__PURE__ */ jsx("i", { className: `bi ${job.saved ? "bi-bookmark-fill" : "bi-bookmark"} me-2` }), job.saved ? "Saved" : "Save job"]
								})
							]
						})]
					})
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "row g-4",
					children: [/* @__PURE__ */ jsx("div", {
						className: "col-lg-7",
						children: /* @__PURE__ */ jsxs("section", {
							className: "rt-card p-4 p-lg-5",
							children: [/* @__PURE__ */ jsxs("h2", {
								className: "rt-card-title mb-3",
								children: [/* @__PURE__ */ jsx("i", { className: "bi bi-file-text" }), "Job description"]
							}), /* @__PURE__ */ jsx("div", {
								className: "rt-job-description",
								children: job.description
							})]
						})
					}), /* @__PURE__ */ jsx("div", {
						className: "col-lg-5",
						children: /* @__PURE__ */ jsx(MatchPanel, {
							match,
							backUrl
						})
					})]
				})
			]
		})]
	});
}
//#endregion
//#region resources/js/Pages/Pages/About.jsx
var About_exports = /* @__PURE__ */ __exportAll({ default: () => About });
var VALUES = [
	[
		"bi-shield-check",
		"Truthful by design",
		"We never invent experience. Every keyword we add must be backed by your CV or confirmed by you, and we show the evidence."
	],
	[
		"bi-speedometer2",
		"Measured, not guessed",
		"Your ATS score comes from a fixed formula, not an AI estimate, so the same CV and job always get the same score."
	],
	[
		"bi-file-earmark-check",
		"Readable by every ATS",
		"Every design is single-column with real text headings: no tables, icons or images that parsers get wrong."
	],
	[
		"bi-unlock",
		"Free where it counts",
		"Checking your ATS score is free and unlimited. You only pay if you want unlimited tailoring."
	]
];
function About({ seo }) {
	return /* @__PURE__ */ jsxs(MainLayout, {
		seo,
		children: [
			/* @__PURE__ */ jsx(NavBar, {}),
			/* @__PURE__ */ jsx(PageHero, {
				eyebrow: "About us",
				icon: "bi-info-circle",
				title: "We help your CV reach a human",
				lead: "Most large employers filter applications with an applicant tracking system before anyone reads them. ResumeTailor AI shows you how your CV scores for a job and helps you fix it, honestly."
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "container pb-5",
				style: { maxWidth: "62rem" },
				children: [
					/* @__PURE__ */ jsxs("section", {
						className: "rt-card rt-overlap p-4 p-lg-5 mb-4",
						children: [/* @__PURE__ */ jsx("h2", {
							className: "h4 fw-bold mb-3",
							children: "Why we built it"
						}), /* @__PURE__ */ jsxs("div", {
							className: "rt-prose",
							children: [
								/* @__PURE__ */ jsx("p", { children: "Good candidates are rejected every day because their CV uses different words from the job description, hides a key skill in a table, or puts contact details where a parser cannot find them. None of that says anything about whether they can do the job." }),
								/* @__PURE__ */ jsx("p", { children: "ResumeTailor AI reads a job description the way an ATS does, lists the keywords recruiters filter on, and scores your CV against them. If you want, it then rewrites your CV around the job, using only what your CV already shows or what you confirm, and gives you a clean PDF that any applicant tracking system can parse." }),
								/* @__PURE__ */ jsx("p", { children: "We also collect live job listings and score them against your CV, so you can spend your time on the roles you actually match." })
							]
						})]
					}),
					/* @__PURE__ */ jsx("div", {
						className: "row g-3 mb-4",
						children: VALUES.map(([icon, title, text]) => /* @__PURE__ */ jsx("div", {
							className: "col-md-6",
							children: /* @__PURE__ */ jsxs("div", {
								className: "rt-card p-4 h-100",
								children: [
									/* @__PURE__ */ jsx("span", {
										className: "rt-stat-icon rt-tone-indigo mb-3",
										children: /* @__PURE__ */ jsx("i", { className: `bi ${icon}` })
									}),
									/* @__PURE__ */ jsx("h3", {
										className: "h6 fw-bold mb-2",
										children: title
									}),
									/* @__PURE__ */ jsx("p", {
										className: "text-muted small mb-0",
										children: text
									})
								]
							})
						}, title))
					}),
					/* @__PURE__ */ jsxs("section", {
						className: "rt-card p-4 p-lg-5 text-center",
						children: [
							/* @__PURE__ */ jsx("h2", {
								className: "h5 fw-bold mb-2",
								children: "Questions or ideas?"
							}),
							/* @__PURE__ */ jsx("p", {
								className: "text-muted mb-3",
								children: "We read every message and usually reply within two working days."
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "d-flex flex-wrap justify-content-center gap-2",
								children: [/* @__PURE__ */ jsx(Link, {
									href: "/contact",
									className: "btn rt-btn-primary px-4",
									children: "Contact us"
								}), /* @__PURE__ */ jsx(Link, {
									href: "/blog",
									className: "btn btn-light border px-4",
									children: "Read our guides"
								})]
							})
						]
					})
				]
			})
		]
	});
}
//#endregion
//#region resources/js/Pages/Pages/Contact.jsx
var Contact_exports = /* @__PURE__ */ __exportAll({ default: () => Contact });
function Contact({ contactEmail, defaults, seo }) {
	const form = useForm({
		name: defaults.name,
		email: defaults.email,
		subject: "",
		message: "",
		website: ""
	});
	const submit = (event) => {
		event.preventDefault();
		form.post("/contact", {
			preserveScroll: true,
			onSuccess: () => form.reset("subject", "message")
		});
	};
	const field = (name, label, props = {}) => /* @__PURE__ */ jsxs("div", {
		className: "mb-3",
		children: [
			/* @__PURE__ */ jsx("label", {
				htmlFor: name,
				className: "form-label fw-semibold small",
				children: label
			}),
			/* @__PURE__ */ jsx("input", {
				id: name,
				className: `form-control ${form.errors[name] ? "is-invalid" : ""}`,
				value: form.data[name],
				onChange: (event) => form.setData(name, event.target.value),
				...props
			}),
			form.errors[name] && /* @__PURE__ */ jsx("div", {
				className: "invalid-feedback",
				children: form.errors[name]
			})
		]
	});
	return /* @__PURE__ */ jsxs(MainLayout, {
		seo,
		children: [
			/* @__PURE__ */ jsx(NavBar, {}),
			/* @__PURE__ */ jsx(PageHero, {
				eyebrow: "Contact",
				icon: "bi-envelope",
				title: "Get in touch",
				lead: "Questions about your score, billing or your account? Send us a message and we will get back to you."
			}),
			/* @__PURE__ */ jsx("div", {
				className: "container pb-5",
				style: { maxWidth: "62rem" },
				children: /* @__PURE__ */ jsxs("div", {
					className: "row g-4 rt-overlap",
					children: [/* @__PURE__ */ jsx("div", {
						className: "col-lg-7",
						children: /* @__PURE__ */ jsxs("form", {
							className: "rt-card p-4 p-lg-5 h-100",
							onSubmit: submit,
							noValidate: true,
							children: [
								/* @__PURE__ */ jsx("h2", {
									className: "h5 fw-bold mb-3",
									children: "Send a message"
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "row g-0 gx-md-3",
									children: [/* @__PURE__ */ jsx("div", {
										className: "col-md-6",
										children: field("name", "Your name", {
											autoComplete: "name",
											maxLength: 100
										})
									}), /* @__PURE__ */ jsx("div", {
										className: "col-md-6",
										children: field("email", "Email", {
											type: "email",
											autoComplete: "email"
										})
									})]
								}),
								field("subject", "Subject", {
									maxLength: 150,
									placeholder: "e.g. Question about Pro"
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "mb-3",
									children: [
										/* @__PURE__ */ jsx("label", {
											htmlFor: "message",
											className: "form-label fw-semibold small",
											children: "Message"
										}),
										/* @__PURE__ */ jsx("textarea", {
											id: "message",
											rows: "6",
											maxLength: 5e3,
											className: `form-control ${form.errors.message ? "is-invalid" : ""}`,
											value: form.data.message,
											onChange: (event) => form.setData("message", event.target.value)
										}),
										form.errors.message && /* @__PURE__ */ jsx("div", {
											className: "invalid-feedback",
											children: form.errors.message
										})
									]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "rt-honeypot",
									"aria-hidden": "true",
									children: [/* @__PURE__ */ jsx("label", {
										htmlFor: "website",
										children: "Website"
									}), /* @__PURE__ */ jsx("input", {
										id: "website",
										tabIndex: -1,
										autoComplete: "off",
										value: form.data.website,
										onChange: (event) => form.setData("website", event.target.value)
									})]
								}),
								form.errors.website && /* @__PURE__ */ jsx("div", {
									className: "alert alert-danger py-2 small",
									children: form.errors.website
								}),
								/* @__PURE__ */ jsx("button", {
									type: "submit",
									className: "btn rt-btn-primary px-4",
									disabled: form.processing,
									children: form.processing ? "Sending..." : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("i", { className: "bi bi-send me-2" }), "Send message"] })
								})
							]
						})
					}), /* @__PURE__ */ jsx("div", {
						className: "col-lg-5",
						children: /* @__PURE__ */ jsxs("div", {
							className: "rt-card p-4 p-lg-5 h-100",
							children: [/* @__PURE__ */ jsx("h2", {
								className: "h5 fw-bold mb-3",
								children: "Other ways to reach us"
							}), /* @__PURE__ */ jsxs("ul", {
								className: "list-unstyled d-grid gap-3 mb-0",
								children: [
									/* @__PURE__ */ jsxs("li", {
										className: "d-flex gap-3",
										children: [/* @__PURE__ */ jsx("span", {
											className: "rt-stat-icon rt-tone-indigo",
											children: /* @__PURE__ */ jsx("i", { className: "bi bi-envelope" })
										}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
											className: "fw-semibold",
											children: "Email"
										}), /* @__PURE__ */ jsx("a", {
											href: `mailto:${contactEmail}`,
											children: contactEmail
										})] })]
									}),
									/* @__PURE__ */ jsxs("li", {
										className: "d-flex gap-3",
										children: [/* @__PURE__ */ jsx("span", {
											className: "rt-stat-icon rt-tone-green",
											children: /* @__PURE__ */ jsx("i", { className: "bi bi-clock" })
										}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
											className: "fw-semibold",
											children: "Response time"
										}), /* @__PURE__ */ jsx("span", {
											className: "text-muted small",
											children: "Usually within two working days"
										})] })]
									}),
									/* @__PURE__ */ jsxs("li", {
										className: "d-flex gap-3",
										children: [/* @__PURE__ */ jsx("span", {
											className: "rt-stat-icon rt-tone-violet",
											children: /* @__PURE__ */ jsx("i", { className: "bi bi-credit-card" })
										}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
											className: "fw-semibold",
											children: "Billing"
										}), /* @__PURE__ */ jsx("span", {
											className: "text-muted small",
											children: "Pro members can manage invoices and cancel any time from Profile & billing."
										})] })]
									})
								]
							})]
						})
					})]
				})
			})
		]
	});
}
//#endregion
//#region resources/js/Components/LegalDocument.jsx
var formatDate$3 = (value) => (/* @__PURE__ */ new Date(`${value}T00:00:00`)).toLocaleDateString("en-GB", {
	day: "numeric",
	month: "long",
	year: "numeric"
});
/**
* A legal page: header, "last updated" date, a table of contents and numbered sections.
*/
function LegalDocument({ seo, title, lead, updatedAt, sections }) {
	return /* @__PURE__ */ jsxs(MainLayout, {
		seo,
		children: [
			/* @__PURE__ */ jsx(NavBar, {}),
			/* @__PURE__ */ jsx(PageHero, {
				eyebrow: "Legal",
				icon: "bi-file-earmark-text",
				title,
				lead
			}),
			/* @__PURE__ */ jsx("div", {
				className: "container pb-5",
				style: { maxWidth: "66rem" },
				children: /* @__PURE__ */ jsxs("div", {
					className: "row g-4 rt-overlap",
					children: [/* @__PURE__ */ jsx("aside", {
						className: "col-lg-4 d-none d-lg-block",
						children: /* @__PURE__ */ jsxs("nav", {
							className: "rt-card p-4 rt-toc",
							"aria-label": "On this page",
							children: [/* @__PURE__ */ jsx("div", {
								className: "rt-filter-label mb-2",
								children: "On this page"
							}), /* @__PURE__ */ jsx("ol", {
								className: "mb-0 ps-3",
								children: sections.map((section) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("a", {
									href: `#${section.id}`,
									children: section.title
								}) }, section.id))
							})]
						})
					}), /* @__PURE__ */ jsx("article", {
						className: "col-lg-8",
						children: /* @__PURE__ */ jsxs("div", {
							className: "rt-card p-4 p-lg-5",
							children: [/* @__PURE__ */ jsxs("p", {
								className: "text-muted small mb-4",
								children: [
									/* @__PURE__ */ jsx("i", { className: "bi bi-calendar3 me-1" }),
									"Last updated ",
									formatDate$3(updatedAt)
								]
							}), /* @__PURE__ */ jsx("div", {
								className: "rt-prose",
								children: sections.map((section, index) => /* @__PURE__ */ jsxs("section", {
									id: section.id,
									style: { scrollMarginTop: "5.5rem" },
									children: [/* @__PURE__ */ jsxs("h2", { children: [
										index + 1,
										". ",
										section.title
									] }), section.body]
								}, section.id))
							})]
						})
					})]
				})
			})
		]
	});
}
//#endregion
//#region resources/js/Pages/Pages/Privacy.jsx
var Privacy_exports = /* @__PURE__ */ __exportAll({ default: () => Privacy });
function Privacy({ updatedAt, contactEmail, seo }) {
	const sections = [
		{
			id: "who-we-are",
			title: "Who we are",
			body: /* @__PURE__ */ jsxs("p", { children: [
				"ResumeTailor AI (\"we\", \"us\") provides an online service that scores CVs against job descriptions, tailors CVs and shows matching job listings. This policy explains what personal data we collect, why, and the choices you have. Questions about it can be sent to ",
				/* @__PURE__ */ jsx("a", {
					href: `mailto:${contactEmail}`,
					children: contactEmail
				}),
				"."
			] })
		},
		{
			id: "data-we-collect",
			title: "Information we collect",
			body: /* @__PURE__ */ jsxs("ul", { children: [
				/* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx("strong", { children: "Account details:" }), " your name, email address and password (stored only as a secure hash) when you create an account."] }),
				/* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx("strong", { children: "CVs and job descriptions:" }), " the text extracted from CVs you upload, the job descriptions you paste, and the tailored resumes and scores we create from them."] }),
				/* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx("strong", { children: "Usage information:" }), " your IP address, browser session and the number of CVs you tailor, which we use to apply plan limits and keep the service secure."] }),
				/* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx("strong", { children: "Payment information:" }), " if you subscribe, payments are handled by Stripe. We receive your subscription status and a customer reference, never your full card number."] }),
				/* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx("strong", { children: "Messages:" }), " anything you send us through the contact form."] }),
				/* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx("strong", { children: "Job search data:" }), " searches, saved jobs and alerts you create."] })
			] })
		},
		{
			id: "how-we-use",
			title: "How we use your information",
			body: /* @__PURE__ */ jsxs("ul", { children: [
				/* @__PURE__ */ jsx("li", { children: "To score and tailor your CV, and to match you with job listings." }),
				/* @__PURE__ */ jsx("li", { children: "To run your account, subscription and plan limits." }),
				/* @__PURE__ */ jsx("li", { children: "To send emails you asked for, such as job alerts and password resets." }),
				/* @__PURE__ */ jsx("li", { children: "To keep the service secure, prevent abuse and fix problems." }),
				/* @__PURE__ */ jsx("li", { children: "To show advertising to visitors on the free plan (see Advertising below)." })
			] })
		},
		{
			id: "ai-processing",
			title: "AI processing of your CV",
			body: /* @__PURE__ */ jsx("p", { children: "To extract job keywords and rewrite your CV, the text of your CV and the job description are sent to a third-party AI service provider that processes it on our behalf. We send only the text needed for the request. The ATS score itself is calculated on our own servers. Please do not include information in your CV that you do not want processed, such as identity or bank numbers." })
		},
		{
			id: "cookies",
			title: "Cookies",
			body: /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("p", { children: "We use a small number of cookies that are essential for the site to work: a session cookie that keeps you signed in and a security cookie that protects forms. These cannot be switched off." }), /* @__PURE__ */ jsx("p", { children: "If advertising is shown, Google and its partners may also set cookies, as described in the next section. You can block or delete cookies in your browser settings, although some parts of the site may then stop working." })] })
		},
		{
			id: "advertising",
			title: "Advertising",
			body: /* @__PURE__ */ jsxs(Fragment, { children: [
				/* @__PURE__ */ jsx("p", { children: "We may show ads served by Google AdSense to visitors who are not on the Pro plan. In connection with this:" }),
				/* @__PURE__ */ jsxs("ul", { children: [
					/* @__PURE__ */ jsx("li", { children: "Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this website or other websites." }),
					/* @__PURE__ */ jsx("li", { children: "Google's use of advertising cookies enables it and its partners to serve ads to you based on your visit to this site and/or other sites on the Internet." }),
					/* @__PURE__ */ jsxs("li", { children: [
						"You may opt out of personalised advertising by visiting ",
						/* @__PURE__ */ jsx("a", {
							href: "https://www.google.com/settings/ads",
							target: "_blank",
							rel: "noreferrer",
							children: "Google Ads Settings"
						}),
						". You can also opt out of some third-party vendors' use of cookies for personalised advertising at ",
						/* @__PURE__ */ jsx("a", {
							href: "https://www.aboutads.info/choices",
							target: "_blank",
							rel: "noreferrer",
							children: "www.aboutads.info"
						}),
						"."
					] }),
					/* @__PURE__ */ jsxs("li", { children: [
						"Learn more in ",
						/* @__PURE__ */ jsx("a", {
							href: "https://policies.google.com/technologies/partner-sites",
							target: "_blank",
							rel: "noreferrer",
							children: "how Google uses information from sites that use its services"
						}),
						"."
					] })
				] }),
				/* @__PURE__ */ jsx("p", { children: "Visitors in the European Economic Area, the United Kingdom and Switzerland are asked for consent before personalised ads are shown. Pro members never see ads." })
			] })
		},
		{
			id: "sharing",
			title: "Who we share information with",
			body: /* @__PURE__ */ jsxs(Fragment, { children: [
				/* @__PURE__ */ jsx("p", { children: "We do not sell your personal information. We share it only with service providers that help us run the service, and only as needed:" }),
				/* @__PURE__ */ jsxs("ul", { children: [
					/* @__PURE__ */ jsx("li", { children: "hosting and email providers;" }),
					/* @__PURE__ */ jsx("li", { children: "the AI service provider that processes CV text (see above);" }),
					/* @__PURE__ */ jsx("li", { children: "Stripe, for payments;" }),
					/* @__PURE__ */ jsx("li", { children: "job listing providers, which receive the search terms used to fetch listings (not your CV);" }),
					/* @__PURE__ */ jsx("li", { children: "Google, for advertising on the free plan." })
				] }),
				/* @__PURE__ */ jsx("p", { children: "We may also disclose information when the law requires it or to protect the rights and safety of our users." })
			] })
		},
		{
			id: "retention",
			title: "How long we keep it",
			body: /* @__PURE__ */ jsx("p", { children: "We keep your account and saved data until you delete your account. Tailored resumes created without an account are kept only as long as needed to show you the result and apply plan limits. Billing records are kept as long as tax law requires. Contact messages are deleted once they are no longer needed to help you." })
		},
		{
			id: "your-rights",
			title: "Your rights and choices",
			body: /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("p", { children: [
				"You can see, update and delete your account details at any time on your ",
				/* @__PURE__ */ jsx(Link, {
					href: "/profile",
					children: "profile page"
				}),
				", and delete your uploaded CVs on the My resumes page. Deleting your account removes your saved resumes and job data."
			] }), /* @__PURE__ */ jsxs("p", { children: [
				"Depending on where you live, you may also have the right to request a copy of your data, ask us to correct or delete it, or object to how we use it. Email us at ",
				/* @__PURE__ */ jsx("a", {
					href: `mailto:${contactEmail}`,
					children: contactEmail
				}),
				" and we will respond within 30 days."
			] })] })
		},
		{
			id: "security",
			title: "Security",
			body: /* @__PURE__ */ jsx("p", { children: "We use encrypted connections (HTTPS), hashed passwords and encrypted storage for sensitive keys, and we limit who can access personal data. No service can be completely secure, so please use a strong, unique password." })
		},
		{
			id: "children",
			title: "Children",
			body: /* @__PURE__ */ jsx("p", { children: "The service is intended for people aged 16 and over who are looking for work. We do not knowingly collect information from children under 16." })
		},
		{
			id: "changes",
			title: "Changes to this policy",
			body: /* @__PURE__ */ jsx("p", { children: "We may update this policy as the service changes. We will change the \"last updated\" date above and, for significant changes, let account holders know by email or on the site." })
		}
	];
	return /* @__PURE__ */ jsx(LegalDocument, {
		seo,
		title: "Privacy Policy",
		lead: "What we collect, why we collect it, and the choices you have.",
		updatedAt,
		sections
	});
}
//#endregion
//#region resources/js/Pages/Pages/Terms.jsx
var Terms_exports = /* @__PURE__ */ __exportAll({ default: () => Terms });
function Terms({ updatedAt, contactEmail, seo }) {
	const sections = [
		{
			id: "agreement",
			title: "Agreement to these terms",
			body: /* @__PURE__ */ jsxs("p", { children: [
				"By using ResumeTailor AI you agree to these terms and to our ",
				/* @__PURE__ */ jsx(Link, {
					href: "/privacy",
					children: "Privacy Policy"
				}),
				". If you do not agree, please do not use the service."
			] })
		},
		{
			id: "the-service",
			title: "The service",
			body: /* @__PURE__ */ jsxs("p", { children: [
				"ResumeTailor AI scores CVs against job descriptions, rewrites CVs to match a job, creates downloadable resumes and shows job listings from third-party providers. Features and plan limits may change over time; we will describe the current limits on the ",
				/* @__PURE__ */ jsx(Link, {
					href: "/pricing",
					children: "pricing page"
				}),
				"."
			] })
		},
		{
			id: "accounts",
			title: "Accounts",
			body: /* @__PURE__ */ jsx("p", { children: "You must give accurate details when you create an account and keep your password secure. You are responsible for activity on your account. You must be at least 16 years old to use the service." })
		},
		{
			id: "your-content",
			title: "Your content",
			body: /* @__PURE__ */ jsx("p", { children: "You keep ownership of the CVs and information you upload. You give us permission to store and process that content, including through our AI service provider, only to provide the service to you. You confirm that you have the right to upload it and that the information in your CV is true." })
		},
		{
			id: "ai-output",
			title: "AI-generated content",
			body: /* @__PURE__ */ jsx("p", { children: "Tailored resumes are produced automatically. We design them to use only information from your CV or skills you confirm, but you must review every resume before you use it and make sure it is accurate. ATS scores are an estimate of keyword match, not a promise of how any employer's system will rank you. We do not guarantee interviews or job offers." })
		},
		{
			id: "job-listings",
			title: "Job listings",
			body: /* @__PURE__ */ jsx("p", { children: "Job listings come from third-party providers. We do not employ, endorse or verify the employers, and listings may be out of date. Always check the details on the original posting before applying." })
		},
		{
			id: "billing",
			title: "Subscriptions and billing",
			body: /* @__PURE__ */ jsxs("ul", { children: [
				/* @__PURE__ */ jsx("li", { children: "Pro is a subscription billed monthly or yearly through Stripe at the price shown when you subscribe." }),
				/* @__PURE__ */ jsx("li", { children: "Subscriptions renew automatically until cancelled. You can cancel any time from Profile & billing; Pro stays active until the end of the period you paid for." }),
				/* @__PURE__ */ jsx("li", { children: "Except where the law requires otherwise, payments are not refundable for partly used periods." }),
				/* @__PURE__ */ jsx("li", { children: "\"Unlimited\" tailoring is subject to a fair-use limit to protect the service for everyone." })
			] })
		},
		{
			id: "acceptable-use",
			title: "Acceptable use",
			body: /* @__PURE__ */ jsxs(Fragment, { children: [
				/* @__PURE__ */ jsx("p", { children: "You must not:" }),
				/* @__PURE__ */ jsxs("ul", { children: [
					/* @__PURE__ */ jsx("li", { children: "upload content you do not have the right to use, or content that is unlawful or harmful;" }),
					/* @__PURE__ */ jsx("li", { children: "use the service to create false or misleading CVs;" }),
					/* @__PURE__ */ jsx("li", { children: "try to get around plan limits, for example with multiple accounts or automated requests;" }),
					/* @__PURE__ */ jsx("li", { children: "scrape, overload, reverse engineer or interfere with the service." })
				] }),
				/* @__PURE__ */ jsx("p", { children: "We may suspend or close accounts that break these rules." })
			] })
		},
		{
			id: "liability",
			title: "Disclaimers and liability",
			body: /* @__PURE__ */ jsx("p", { children: "The service is provided \"as is\". To the extent the law allows, we are not liable for indirect or consequential losses, or for decisions employers make about your applications. Our total liability to you is limited to the amount you paid us in the 12 months before the claim. Nothing in these terms limits rights you have under consumer law." })
		},
		{
			id: "changes",
			title: "Changes and termination",
			body: /* @__PURE__ */ jsx("p", { children: "We may update these terms; the \"last updated\" date shows the latest version, and continuing to use the service means you accept it. You can stop using the service and delete your account at any time." })
		},
		{
			id: "contact",
			title: "Contact",
			body: /* @__PURE__ */ jsxs("p", { children: [
				"Questions about these terms can be sent to ",
				/* @__PURE__ */ jsx("a", {
					href: `mailto:${contactEmail}`,
					children: contactEmail
				}),
				" or through our ",
				/* @__PURE__ */ jsx(Link, {
					href: "/contact",
					children: "contact page"
				}),
				"."
			] })
		}
	];
	return /* @__PURE__ */ jsx(LegalDocument, {
		seo,
		title: "Terms of Service",
		lead: "The rules for using ResumeTailor AI, in plain language.",
		updatedAt,
		sections
	});
}
//#endregion
//#region resources/js/Pages/Pricing.jsx
var Pricing_exports = /* @__PURE__ */ __exportAll({ default: () => Pricing });
var formatDate$2 = (value) => value ? (/* @__PURE__ */ new Date(`${value}T00:00:00`)).toLocaleDateString(void 0, {
	day: "numeric",
	month: "long",
	year: "numeric"
}) : null;
/**
* "$79" a year shown as "$6.58" a month. Prices are display strings from config, so the currency
* symbol is whatever precedes the number.
*/
var perMonth = (amount) => {
	const value = parseFloat(String(amount).replace(/[^0-9.]/g, ""));
	const symbol = String(amount).replace(/[0-9.,\s]/g, "");
	return Number.isFinite(value) && value > 0 ? `${symbol}${(value / 12).toFixed(2)}` : null;
};
var FAQS = [
	["Is checking my ATS score really free?", "Yes. Scanning your CV against a job description is unlimited on every plan. Only creating a tailored CV counts towards your monthly quota."],
	["What counts as one tailored CV?", "Each time we rewrite your CV for a job. Confirming extra skills on that CV or switching between the designs you have access to does not count again."],
	["When does my free CV reset?", "On the first day of every month."],
	["Can I cancel Pro any time?", "Yes. Cancel from the billing page in one click. You keep Pro until the end of the period you paid for, then move back to Free."],
	["How do payments work?", "Payments are processed securely by Stripe. We never see or store your card details. Promo codes can be entered at checkout."]
];
function Feature({ children, included = true }) {
	return /* @__PURE__ */ jsxs("li", {
		className: included ? "" : "is-off",
		children: [/* @__PURE__ */ jsx("i", { className: `bi ${included ? "bi-check-circle-fill" : "bi-x-circle"} mt-1` }), /* @__PURE__ */ jsx("span", { children })]
	});
}
function Cell({ value }) {
	if (value === true) return /* @__PURE__ */ jsx("i", {
		className: "bi bi-check-lg",
		"aria-label": "Included"
	});
	if (value === false) return /* @__PURE__ */ jsx("i", {
		className: "bi bi-dash",
		"aria-label": "Not included"
	});
	return /* @__PURE__ */ jsx("span", {
		className: "fw-semibold",
		children: value
	});
}
function Pricing({ prices, limits, subscription, hasBillingAccount, checkoutStatus, seo }) {
	const { auth, billing, errors } = usePage().props;
	const user = auth?.user;
	const isPro = billing?.plan === "pro";
	const [interval, setBillingInterval] = useState("yearly");
	const [isRedirecting, setIsRedirecting] = useState(false);
	const price = prices.find((option) => option.interval === interval) ?? prices[0];
	const yearly = prices.find((option) => option.interval === "yearly");
	const startCheckout = () => {
		setIsRedirecting(true);
		router.post(`/billing/checkout/${price.interval}`, {}, { onFinish: () => setIsRedirecting(false) });
	};
	const freeLimit = `${limits.free_monthly_tailors} tailored CV${limits.free_monthly_tailors === 1 ? "" : "s"} a month`;
	const proLimit = limits.pro_monthly_tailors > 0 ? `Up to ${limits.pro_monthly_tailors} a month` : "Unlimited";
	const comparison = [
		[
			"ATS score checks with fixes",
			"Unlimited",
			"Unlimited"
		],
		[
			"Tailored CVs",
			`${limits.free_monthly_tailors} a month`,
			proLimit
		],
		[
			"Before and after ATS score",
			true,
			true
		],
		[
			"Confirm missing skills and re-tailor",
			true,
			true
		],
		[
			"Keep the design of your own CV",
			true,
			true
		],
		[
			"ATS-safe designs",
			`${limits.free_templates} designs`,
			"All 15"
		],
		[
			"Job matching and application tracker",
			true,
			true
		]
	];
	return /* @__PURE__ */ jsxs(MainLayout, {
		seo,
		children: [
			/* @__PURE__ */ jsx(NavBar, {}),
			/* @__PURE__ */ jsx("header", {
				className: "rt-hero rt-hero-compact",
				children: /* @__PURE__ */ jsxs("div", {
					className: "container",
					children: [
						/* @__PURE__ */ jsxs("span", {
							className: "rt-pill mb-3",
							children: [/* @__PURE__ */ jsx("i", { className: "bi bi-tag" }), "Pricing"]
						}),
						/* @__PURE__ */ jsx("h1", {
							className: "mb-3",
							children: "Land more interviews for less than a coffee"
						}),
						/* @__PURE__ */ jsx("p", {
							className: "rt-hero-lead mb-4",
							children: "Check your ATS score free, as often as you like. Tailor one CV free every month, or go Pro for every job you apply to."
						}),
						/* @__PURE__ */ jsx("div", {
							className: "rt-billing-toggle",
							role: "tablist",
							"aria-label": "Billing period",
							children: prices.map((option) => /* @__PURE__ */ jsxs("button", {
								type: "button",
								role: "tab",
								"aria-selected": interval === option.interval,
								className: interval === option.interval ? "is-active" : "",
								onClick: () => setBillingInterval(option.interval),
								children: [option.interval === "yearly" ? "Yearly" : "Monthly", option.note && /* @__PURE__ */ jsx("span", {
									className: "rt-save-badge",
									children: option.note
								})]
							}, option.interval))
						})
					]
				})
			}),
			/* @__PURE__ */ jsx("div", {
				className: "container pb-5",
				style: { maxWidth: "62rem" },
				children: /* @__PURE__ */ jsxs("div", {
					className: "rt-overlap",
					children: [
						checkoutStatus === "success" && /* @__PURE__ */ jsxs("div", {
							className: "alert alert-success d-flex gap-2 align-items-start shadow-sm",
							role: "status",
							children: [/* @__PURE__ */ jsx("i", { className: "bi bi-patch-check-fill mt-1" }), /* @__PURE__ */ jsxs("span", { children: [
								/* @__PURE__ */ jsx("strong", { children: "Thanks for subscribing!" }),
								" ",
								isPro ? "Pro is active on your account." : "We are confirming your payment. Pro usually activates within a minute; refresh this page if it has not yet."
							] })]
						}),
						checkoutStatus === "cancelled" && /* @__PURE__ */ jsxs("div", {
							className: "alert alert-light border shadow-sm py-2",
							role: "status",
							children: [/* @__PURE__ */ jsx("i", { className: "bi bi-info-circle me-2" }), "Checkout was cancelled. You have not been charged."]
						}),
						errors?.billing && /* @__PURE__ */ jsx("div", {
							className: "alert alert-danger shadow-sm py-2",
							role: "alert",
							children: errors.billing
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "row g-4 align-items-stretch",
							children: [/* @__PURE__ */ jsx("div", {
								className: "col-md-6",
								children: /* @__PURE__ */ jsxs("section", {
									className: "rt-card rt-plan-card",
									children: [
										/* @__PURE__ */ jsxs("div", {
											className: "d-flex align-items-center gap-3 mb-3",
											children: [
												/* @__PURE__ */ jsx("span", {
													className: "rt-plan-icon",
													children: /* @__PURE__ */ jsx("i", { className: "bi bi-rocket" })
												}),
												/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
													className: "h5 fw-bold mb-0",
													children: "Free"
												}), /* @__PURE__ */ jsx("small", {
													className: "text-muted",
													children: "For an occasional application"
												})] }),
												!isPro && user && /* @__PURE__ */ jsx("span", {
													className: "badge text-bg-light border ms-auto",
													children: "Current plan"
												})
											]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "mb-4",
											children: [/* @__PURE__ */ jsx("span", {
												className: "rt-plan-price",
												children: "$0"
											}), /* @__PURE__ */ jsx("span", {
												className: "rt-plan-period",
												children: " / forever"
											})]
										}),
										/* @__PURE__ */ jsxs("ul", {
											className: "list-unstyled rt-plan-features mb-4 flex-grow-1",
											children: [
												/* @__PURE__ */ jsx(Feature, { children: "Unlimited ATS score checks with fixes" }),
												/* @__PURE__ */ jsx(Feature, { children: freeLimit }),
												/* @__PURE__ */ jsxs(Feature, { children: [limits.free_templates, " ATS-safe designs, including your own"] }),
												/* @__PURE__ */ jsx(Feature, { children: "Job matching and application tracker" }),
												/* @__PURE__ */ jsx(Feature, {
													included: false,
													children: "All 15 designs"
												})
											]
										}),
										isPro ? /* @__PURE__ */ jsx("button", {
											type: "button",
											className: "btn btn-outline-secondary w-100",
											disabled: true,
											children: "Included in Pro"
										}) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Link, {
											href: "/",
											className: "btn rt-btn-soft w-100 py-2",
											children: billing?.remaining > 0 ? "Use my free CV" : "Check my ATS score"
										}), billing && /* @__PURE__ */ jsx("small", {
											className: "text-muted d-block text-center mt-2",
											children: billing.remaining > 0 ? `${billing.remaining} free tailored CV${billing.remaining === 1 ? "" : "s"} left this month` : `Next free CV on ${formatDate$2(billing.resets_at)}`
										})] })
									]
								})
							}), /* @__PURE__ */ jsx("div", {
								className: "col-md-6",
								children: /* @__PURE__ */ jsxs("section", {
									className: "rt-card rt-plan-card is-featured",
									children: [
										/* @__PURE__ */ jsx("span", {
											className: "rt-plan-ribbon",
											children: isPro ? "Your plan" : "Most popular"
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "d-flex align-items-center gap-3 mb-3",
											children: [/* @__PURE__ */ jsx("span", {
												className: "rt-plan-icon",
												children: /* @__PURE__ */ jsx("i", { className: "bi bi-stars" })
											}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
												className: "h5 fw-bold mb-0",
												children: "Pro"
											}), /* @__PURE__ */ jsx("small", {
												className: "text-muted",
												children: "For an active job search"
											})] })]
										}),
										/* @__PURE__ */ jsx("div", {
											className: "mb-4",
											children: price.interval === "yearly" && perMonth(price.amount) ? /* @__PURE__ */ jsxs(Fragment, { children: [
												/* @__PURE__ */ jsx("span", {
													className: "rt-plan-price",
													children: perMonth(price.amount)
												}),
												/* @__PURE__ */ jsx("span", {
													className: "rt-plan-period",
													children: " / month"
												}),
												/* @__PURE__ */ jsxs("div", {
													className: "small text-muted mt-1",
													children: [price.amount, " billed once a year"]
												})
											] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
												/* @__PURE__ */ jsx("span", {
													className: "rt-plan-price",
													children: price.amount
												}),
												/* @__PURE__ */ jsxs("span", {
													className: "rt-plan-period",
													children: [" / ", price.period]
												}),
												yearly?.note && /* @__PURE__ */ jsxs("div", {
													className: "small text-muted mt-1",
													children: [
														"or ",
														yearly.amount,
														" a year (",
														yearly.note.toLowerCase(),
														")"
													]
												})
											] })
										}),
										/* @__PURE__ */ jsxs("ul", {
											className: "list-unstyled rt-plan-features mb-4 flex-grow-1",
											children: [
												/* @__PURE__ */ jsx(Feature, { children: "Everything in Free" }),
												/* @__PURE__ */ jsx(Feature, { children: limits.pro_monthly_tailors > 0 ? /* @__PURE__ */ jsxs(Fragment, { children: [
													"Up to ",
													/* @__PURE__ */ jsxs("strong", { children: [limits.pro_monthly_tailors, " tailored CVs"] }),
													" a month (fair use)"
												] }) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("strong", { children: "Unlimited" }), " tailored CVs"] }) }),
												/* @__PURE__ */ jsx(Feature, { children: "All 15 ATS-safe designs" }),
												/* @__PURE__ */ jsx(Feature, { children: "Tailor a CV for every application" }),
												/* @__PURE__ */ jsx(Feature, { children: "Cancel any time" })
											]
										}),
										isPro ? /* @__PURE__ */ jsxs(Fragment, { children: [subscription?.on_grace_period && subscription.ends_at && /* @__PURE__ */ jsxs("div", {
											className: "alert alert-warning py-2 small mb-2",
											children: [
												"Cancelled. Pro stays active until ",
												formatDate$2(subscription.ends_at),
												"."
											]
										}), hasBillingAccount ? /* @__PURE__ */ jsxs("a", {
											href: "/billing/portal",
											className: "btn rt-btn-primary w-100",
											children: [/* @__PURE__ */ jsx("i", { className: "bi bi-credit-card me-2" }), "Manage billing"]
										}) : /* @__PURE__ */ jsx("button", {
											type: "button",
											className: "btn rt-btn-primary w-100",
											disabled: true,
											children: "Pro is active"
										})] }) : !user ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Link, {
											href: "/register",
											className: "btn rt-btn-primary w-100",
											children: "Get Pro"
										}), /* @__PURE__ */ jsxs("small", {
											className: "text-muted d-block mt-2 text-center",
											children: ["Create a free account first. Already have one? ", /* @__PURE__ */ jsx(Link, {
												href: "/login",
												children: "Log in"
											})]
										})] }) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("button", {
											type: "button",
											className: "btn rt-btn-primary w-100",
											onClick: startCheckout,
											disabled: !price.available || isRedirecting,
											children: isRedirecting ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("span", {
												className: "spinner-border spinner-border-sm me-2",
												"aria-hidden": "true"
											}), "Opening secure checkout..."] }) : price.available ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("i", { className: "bi bi-lightning-charge-fill me-2" }), "Upgrade to Pro"] }) : "Coming soon"
										}), /* @__PURE__ */ jsxs("small", {
											className: "text-muted d-block mt-2 text-center",
											children: [/* @__PURE__ */ jsx("i", { className: "bi bi-lock me-1" }), "Secure payment by Stripe. Promo codes accepted."]
										})] })
									]
								})
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "rt-trust my-4 my-lg-5",
							children: [
								/* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("i", { className: "bi bi-shield-check" }), "Payments by Stripe"] }),
								/* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("i", { className: "bi bi-arrow-counterclockwise" }), "Cancel any time"] }),
								/* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("i", { className: "bi bi-speedometer2" }), "Free ATS checks forever"] }),
								/* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("i", { className: "bi bi-file-earmark-check" }), "ATS-safe PDFs only"] })
							]
						}),
						/* @__PURE__ */ jsxs("section", {
							className: "rt-card mb-4",
							children: [/* @__PURE__ */ jsx("div", {
								className: "p-4 pb-2",
								children: /* @__PURE__ */ jsxs("h2", {
									className: "rt-card-title",
									children: [/* @__PURE__ */ jsx("i", { className: "bi bi-columns-gap" }), "Compare plans"]
								})
							}), /* @__PURE__ */ jsx("div", {
								className: "table-responsive",
								children: /* @__PURE__ */ jsxs("table", {
									className: "rt-compare",
									children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
										/* @__PURE__ */ jsx("th", {
											scope: "col",
											children: /* @__PURE__ */ jsx("span", {
												className: "visually-hidden",
												children: "Feature"
											})
										}),
										/* @__PURE__ */ jsx("th", {
											scope: "col",
											children: "Free"
										}),
										/* @__PURE__ */ jsx("th", {
											scope: "col",
											className: "is-pro",
											children: "Pro"
										})
									] }) }), /* @__PURE__ */ jsx("tbody", { children: comparison.map(([feature, free, pro]) => /* @__PURE__ */ jsxs("tr", { children: [
										/* @__PURE__ */ jsx("td", { children: feature }),
										/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(Cell, { value: free }) }),
										/* @__PURE__ */ jsx("td", {
											className: "is-pro",
											children: /* @__PURE__ */ jsx(Cell, { value: pro })
										})
									] }, feature)) })]
								})
							})]
						}),
						/* @__PURE__ */ jsxs("section", {
							id: "faq",
							className: "rt-card p-4",
							style: { scrollMarginTop: "5.5rem" },
							children: [/* @__PURE__ */ jsxs("h2", {
								className: "rt-card-title mb-2",
								children: [/* @__PURE__ */ jsx("i", { className: "bi bi-question-circle" }), "Questions"]
							}), /* @__PURE__ */ jsx("div", {
								className: "rt-faq",
								children: FAQS.map(([question, answer]) => /* @__PURE__ */ jsxs("details", { children: [/* @__PURE__ */ jsx("summary", { children: question }), /* @__PURE__ */ jsx("p", { children: answer })] }, question))
							})]
						})
					]
				})
			})
		]
	});
}
//#endregion
//#region resources/js/Pages/Profile/Edit.jsx
var Edit_exports = /* @__PURE__ */ __exportAll({ default: () => Edit });
var formatDate$1 = (value) => value ? (/* @__PURE__ */ new Date(`${value}T00:00:00`)).toLocaleDateString(void 0, {
	day: "numeric",
	month: "long",
	year: "numeric"
}) : null;
/**
* The account's plan, this month's usage and the way to upgrade or manage billing.
*/
function PlanCard({ billing, hasBillingAccount, subscriptionEndsAt }) {
	if (!billing) return null;
	const isPro = billing.plan === "pro";
	const used = billing.limit > 0 ? Math.min(billing.used, billing.limit) : billing.used;
	return /* @__PURE__ */ jsxs("section", {
		className: `rt-usage mb-4 ${!isPro && billing.remaining === 0 ? "is-empty" : ""}`,
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "d-flex justify-content-between align-items-center gap-2 mb-2",
				children: [/* @__PURE__ */ jsx("h2", {
					className: "h6 fw-bold mb-0",
					children: "Plan & billing"
				}), isPro ? /* @__PURE__ */ jsxs("span", {
					className: "rt-plan-pill",
					children: [/* @__PURE__ */ jsx("i", { className: "bi bi-stars" }), "Pro"]
				}) : /* @__PURE__ */ jsx("span", {
					className: "badge text-bg-light border",
					children: "Free"
				})]
			}),
			billing.limit > 0 ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("div", {
				className: "d-flex justify-content-between small mb-1",
				children: [/* @__PURE__ */ jsx("span", { children: "Tailored CVs this month" }), /* @__PURE__ */ jsxs("span", {
					className: "fw-semibold",
					children: [
						used,
						" / ",
						billing.limit
					]
				})]
			}), /* @__PURE__ */ jsx("div", {
				className: "rt-usage-bar mb-2",
				role: "progressbar",
				"aria-valuemin": 0,
				"aria-valuemax": billing.limit,
				"aria-valuenow": used,
				"aria-label": "Tailored CVs used this month",
				children: /* @__PURE__ */ jsx("span", { style: { width: `${used / billing.limit * 100}%` } })
			})] }) : /* @__PURE__ */ jsxs("p", {
				className: "small mb-2",
				children: [
					"Unlimited tailored CVs · ",
					billing.used,
					" this month"
				]
			}),
			/* @__PURE__ */ jsx("p", {
				className: "small text-muted mb-3",
				children: subscriptionEndsAt ? `Your Pro subscription is cancelled and ends on ${formatDate$1(subscriptionEndsAt)}.` : `Usage resets on ${formatDate$1(billing.resets_at)}. ATS score checks are always free.`
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "d-flex flex-wrap gap-2",
				children: [isPro ? hasBillingAccount && /* @__PURE__ */ jsxs("a", {
					href: "/billing/portal",
					className: "btn btn-sm rt-btn-soft",
					children: [/* @__PURE__ */ jsx("i", { className: "bi bi-credit-card me-1" }), "Manage billing & invoices"]
				}) : /* @__PURE__ */ jsxs(Link, {
					href: "/pricing",
					className: "btn btn-sm rt-btn-primary px-3 py-1",
					children: [/* @__PURE__ */ jsx("i", { className: "bi bi-lightning-charge-fill me-1" }), "Upgrade to Pro"]
				}), !isPro && hasBillingAccount && /* @__PURE__ */ jsx("a", {
					href: "/billing/portal",
					className: "btn btn-sm btn-link text-muted",
					children: "Billing history"
				})]
			})
		]
	});
}
function Edit({ mustVerifyEmail, status, hasBillingAccount = false, subscriptionEndsAt = null }) {
	const { auth, billing } = usePage().props;
	const user = auth.user;
	const profileForm = useForm({
		name: user.name,
		email: user.email
	});
	const passwordForm = useForm({
		current_password: "",
		password: "",
		password_confirmation: ""
	});
	const deleteForm = useForm({ password: "" });
	const updateProfile = (event) => {
		event.preventDefault();
		profileForm.patch("/profile", { preserveScroll: true });
	};
	const updatePassword = (event) => {
		event.preventDefault();
		passwordForm.put("/password", {
			preserveScroll: true,
			onSuccess: () => passwordForm.reset()
		});
	};
	const deleteAccount = (event) => {
		event.preventDefault();
		if (window.confirm("Delete your account permanently? This cannot be undone.")) deleteForm.delete("/profile");
	};
	return /* @__PURE__ */ jsxs(AuthLayout, {
		title: "Your profile",
		subtitle: "Update your account details and password.",
		children: [
			/* @__PURE__ */ jsx(Head, { title: "Profile" }),
			status && /* @__PURE__ */ jsx("div", {
				className: "alert alert-success py-2 small",
				children: status
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "d-flex flex-wrap gap-2 mb-4",
				children: [/* @__PURE__ */ jsxs(Link, {
					href: "/resumes",
					className: "btn btn-sm btn-outline-primary",
					children: [/* @__PURE__ */ jsx("i", { className: "bi bi-file-earmark-text me-1" }), " Manage resumes"]
				}), mustVerifyEmail && !user.email_verified && /* @__PURE__ */ jsx("span", {
					className: "badge text-bg-warning align-self-center",
					children: "Email not verified"
				})]
			}),
			/* @__PURE__ */ jsx(PlanCard, {
				billing,
				hasBillingAccount,
				subscriptionEndsAt
			}),
			/* @__PURE__ */ jsxs("form", {
				onSubmit: updateProfile,
				noValidate: true,
				className: "mb-4",
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "h6 fw-bold mb-3",
						children: "Profile information"
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mb-3",
						children: [
							/* @__PURE__ */ jsx("label", {
								htmlFor: "name",
								className: "form-label fw-semibold",
								children: "Name"
							}),
							/* @__PURE__ */ jsx("input", {
								id: "name",
								type: "text",
								className: `form-control ${profileForm.errors.name ? "is-invalid" : ""}`,
								value: profileForm.data.name,
								onChange: (event) => profileForm.setData("name", event.target.value)
							}),
							profileForm.errors.name && /* @__PURE__ */ jsx("div", {
								className: "invalid-feedback",
								children: profileForm.errors.name
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mb-3",
						children: [
							/* @__PURE__ */ jsx("label", {
								htmlFor: "email",
								className: "form-label fw-semibold",
								children: "Email"
							}),
							/* @__PURE__ */ jsx("input", {
								id: "email",
								type: "email",
								className: `form-control ${profileForm.errors.email ? "is-invalid" : ""}`,
								value: profileForm.data.email,
								onChange: (event) => profileForm.setData("email", event.target.value)
							}),
							profileForm.errors.email && /* @__PURE__ */ jsx("div", {
								className: "invalid-feedback",
								children: profileForm.errors.email
							})
						]
					}),
					/* @__PURE__ */ jsx("button", {
						type: "submit",
						className: "btn btn-primary",
						disabled: profileForm.processing,
						children: "Save profile"
					})
				]
			}),
			/* @__PURE__ */ jsx("hr", { className: "my-4" }),
			/* @__PURE__ */ jsxs("form", {
				onSubmit: updatePassword,
				noValidate: true,
				className: "mb-4",
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "h6 fw-bold mb-3",
						children: "Update password"
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mb-3",
						children: [
							/* @__PURE__ */ jsx("label", {
								htmlFor: "current_password",
								className: "form-label fw-semibold",
								children: "Current password"
							}),
							/* @__PURE__ */ jsx("input", {
								id: "current_password",
								type: "password",
								className: `form-control ${passwordForm.errors.current_password ? "is-invalid" : ""}`,
								value: passwordForm.data.current_password,
								autoComplete: "current-password",
								onChange: (event) => passwordForm.setData("current_password", event.target.value)
							}),
							passwordForm.errors.current_password && /* @__PURE__ */ jsx("div", {
								className: "invalid-feedback",
								children: passwordForm.errors.current_password
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mb-3",
						children: [
							/* @__PURE__ */ jsx("label", {
								htmlFor: "new_password",
								className: "form-label fw-semibold",
								children: "New password"
							}),
							/* @__PURE__ */ jsx("input", {
								id: "new_password",
								type: "password",
								className: `form-control ${passwordForm.errors.password ? "is-invalid" : ""}`,
								value: passwordForm.data.password,
								autoComplete: "new-password",
								onChange: (event) => passwordForm.setData("password", event.target.value)
							}),
							passwordForm.errors.password && /* @__PURE__ */ jsx("div", {
								className: "invalid-feedback",
								children: passwordForm.errors.password
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mb-3",
						children: [/* @__PURE__ */ jsx("label", {
							htmlFor: "password_confirmation",
							className: "form-label fw-semibold",
							children: "Confirm new password"
						}), /* @__PURE__ */ jsx("input", {
							id: "password_confirmation",
							type: "password",
							className: "form-control",
							value: passwordForm.data.password_confirmation,
							autoComplete: "new-password",
							onChange: (event) => passwordForm.setData("password_confirmation", event.target.value)
						})]
					}),
					/* @__PURE__ */ jsx("button", {
						type: "submit",
						className: "btn btn-primary",
						disabled: passwordForm.processing,
						children: "Update password"
					})
				]
			}),
			/* @__PURE__ */ jsx("hr", { className: "my-4" }),
			/* @__PURE__ */ jsxs("form", {
				onSubmit: deleteAccount,
				noValidate: true,
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "h6 fw-bold mb-2",
						children: "Delete account"
					}),
					/* @__PURE__ */ jsxs("p", {
						className: "text-muted small",
						children: ["This removes your account, saved resumes, and matches. Download any tailored resumes you need first.", billing?.plan === "pro" && !subscriptionEndsAt && " Cancel your Pro subscription from the billing page first."]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mb-3",
						children: [
							/* @__PURE__ */ jsx("label", {
								htmlFor: "delete_password",
								className: "form-label fw-semibold",
								children: "Password"
							}),
							/* @__PURE__ */ jsx("input", {
								id: "delete_password",
								type: "password",
								className: `form-control ${deleteForm.errors.password ? "is-invalid" : ""}`,
								value: deleteForm.data.password,
								onChange: (event) => deleteForm.setData("password", event.target.value)
							}),
							deleteForm.errors.password && /* @__PURE__ */ jsx("div", {
								className: "invalid-feedback",
								children: deleteForm.errors.password
							})
						]
					}),
					/* @__PURE__ */ jsx("button", {
						type: "submit",
						className: "btn btn-outline-danger",
						disabled: deleteForm.processing,
						children: "Delete account"
					})
				]
			})
		]
	});
}
//#endregion
//#region resources/js/Pages/ResumeTailor.jsx
var ResumeTailor_exports = /* @__PURE__ */ __exportAll({ default: () => ResumeTailor });
var STAGES = [
	{
		label: "Reading your CV",
		icon: "bi-file-earmark-text"
	},
	{
		label: "Extracting ATS keywords from the job description",
		icon: "bi-search"
	},
	{
		label: "Scoring your current CV",
		icon: "bi-speedometer2"
	},
	{
		label: "Rewriting every section with JD keywords",
		icon: "bi-magic"
	},
	{
		label: "Verifying claims against your CV",
		icon: "bi-shield-check"
	},
	{
		label: "Re-scoring the tailored resume",
		icon: "bi-graph-up-arrow"
	}
];
var ALLOWED_TYPES$1 = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
var MAX_FILE_BYTES$1 = 5242880;
var MIN_JD_LENGTH = 50;
function ScanReport({ scan, isProcessing, onTailor }) {
	const score = scan.score;
	const potential = Math.min(100, score.score + BREAKDOWN_ORDER$1.reduce((total, key) => total + (score.breakdown[key]?.gain ?? 0), 0));
	return /* @__PURE__ */ jsxs("div", {
		className: "rt-overlap d-grid gap-4 rt-fade-in",
		style: { gridTemplateColumns: "minmax(0, 1fr)" },
		children: [/* @__PURE__ */ jsx("section", {
			className: "rt-card",
			children: /* @__PURE__ */ jsx("div", {
				className: "p-4 p-lg-5 rt-card-body",
				children: /* @__PURE__ */ jsxs("div", {
					className: "row g-4 align-items-center",
					children: [/* @__PURE__ */ jsx("div", {
						className: "col-lg-4 d-flex justify-content-center",
						children: /* @__PURE__ */ jsx("div", {
							className: "rt-gauge-slot",
							children: /* @__PURE__ */ jsx(ScoreGauge, {
								score: score.score,
								caption: "ATS match"
							})
						})
					}), /* @__PURE__ */ jsxs("div", {
						className: "col-lg-8",
						children: [
							scan.job_title && /* @__PURE__ */ jsx("span", {
								className: "badge rounded-pill text-bg-light border mb-2",
								children: scan.job_title
							}),
							/* @__PURE__ */ jsxs("h2", {
								className: "h4 fw-bold mb-2",
								children: [
									"Your CV matches ",
									score.score,
									"% of this job"
								]
							}),
							/* @__PURE__ */ jsxs("p", {
								className: "text-muted mb-3",
								children: [
									"Found ",
									/* @__PURE__ */ jsx("strong", { children: score.matched.length }),
									" of ",
									/* @__PURE__ */ jsx("strong", { children: score.matched.length + (score.missing_total ?? score.missing.length) }),
									" job keywords, including ",
									/* @__PURE__ */ jsxs("strong", { children: [
										score.required_matched,
										"/",
										score.required_total
									] }),
									" required ones.",
									potential > score.score && /* @__PURE__ */ jsxs(Fragment, { children: [
										" Fixing the items below could raise it to about ",
										/* @__PURE__ */ jsxs("strong", { children: [potential, "%"] }),
										"."
									] })
								]
							}),
							/* @__PURE__ */ jsxs("p", {
								className: "text-muted small mb-3",
								children: [/* @__PURE__ */ jsx("i", { className: "bi bi-info-circle me-1" }), "An estimate of how well your CV matches this job, scored the way keyword-based ATS tools rank CVs. Each employer's system works differently."]
							}),
							/* @__PURE__ */ jsxs("button", {
								type: "button",
								className: "btn rt-btn-primary px-4",
								onClick: onTailor,
								disabled: isProcessing,
								children: [/* @__PURE__ */ jsx("i", { className: "bi bi-magic me-2" }), "Tailor my CV to fix this"]
							})
						]
					})]
				})
			})
		}), /* @__PURE__ */ jsxs("div", {
			className: "row g-4",
			children: [/* @__PURE__ */ jsx("div", {
				className: "col-lg-6",
				children: /* @__PURE__ */ jsx("section", {
					className: "rt-card h-100",
					children: /* @__PURE__ */ jsxs("div", {
						className: "p-4 rt-card-body",
						children: [/* @__PURE__ */ jsxs("h2", {
							className: "rt-card-title mb-3",
							children: [/* @__PURE__ */ jsx("i", { className: "bi bi-list-check" }), "Checks and fixes"]
						}), /* @__PURE__ */ jsx(ScoreChecklist, { breakdown: score.breakdown })]
					})
				})
			}), /* @__PURE__ */ jsx("div", {
				className: "col-lg-6",
				children: /* @__PURE__ */ jsx("section", {
					className: "rt-card h-100",
					children: /* @__PURE__ */ jsxs("div", {
						className: "p-4 rt-card-body",
						children: [
							/* @__PURE__ */ jsxs("h2", {
								className: "rt-card-title mb-1",
								children: [/* @__PURE__ */ jsx("i", { className: "bi bi-tags" }), "Job keywords"]
							}),
							/* @__PURE__ */ jsx("p", {
								className: "text-muted small mb-3",
								children: "Green = found, amber = only in your skills list, red = missing."
							}),
							/* @__PURE__ */ jsx(KeywordGroups, {
								matched: score.matched,
								missing: score.missing,
								hiddenCount: score.missing_hidden ?? 0
							})
						]
					})
				})
			})]
		})]
	});
}
function ResumeTailor({ seo, prefill = null, maxJobDescriptionWords = 15e3 }) {
	const [cvFile, setCvFile] = useState(null);
	const [isDragging, setIsDragging] = useState(false);
	const [jobDescription, setJobDescription] = useState(prefill?.job_description || "");
	const [isProcessing, setIsProcessing] = useState(false);
	const [progressStage, setProgressStage] = useState(0);
	const [elapsed, setElapsed] = useState(0);
	const [error, setError] = useState("");
	const [upgrade, setUpgrade] = useState(null);
	const { billing } = usePage().props;
	const [scan, setScan] = useState(null);
	const [isScanning, setIsScanning] = useState(false);
	const scanRef = useRef(null);
	const upgradeRef = useRef(null);
	const fileInput = useRef(null);
	const timers = useRef([]);
	useEffect(() => () => timers.current.forEach(clearInterval), []);
	const jobDescriptionWords = useMemo(() => (jobDescription.match(/\S+/g) || []).length, [jobDescription]);
	const isJobDescriptionTooLong = jobDescriptionWords > maxJobDescriptionWords;
	const selectFile = (file) => {
		setError("");
		if (!file) return;
		if (!ALLOWED_TYPES$1.includes(file.type) && !/\.(pdf|docx)$/i.test(file.name)) {
			setError("Please upload your CV as a PDF or DOCX file.");
			return;
		}
		if (file.size > MAX_FILE_BYTES$1) {
			setError("File size must be under 5MB.");
			return;
		}
		setCvFile(file);
	};
	const clearFile = () => {
		setCvFile(null);
		if (fileInput.current) fileInput.current.value = "";
	};
	const startProgress = () => {
		setProgressStage(0);
		setElapsed(0);
		const stageTimer = setInterval(() => setProgressStage((prev) => Math.min(prev + 1, STAGES.length - 1)), 5e3);
		const clockTimer = setInterval(() => setElapsed((prev) => prev + 1), 1e3);
		timers.current = [stageTimer, clockTimer];
	};
	const stopProgress = () => {
		timers.current.forEach(clearInterval);
		timers.current = [];
	};
	/**
	* A 402 means the plan does not allow this (quota used up or a Pro design): show an upgrade prompt
	* instead of an error. Returns whether it handled the error.
	*/
	const showUpgradeIfNeeded = (err) => {
		if (err?.response?.status !== 402) return false;
		setUpgrade({
			message: err.response.data?.message,
			url: err.response.data?.upgrade_url
		});
		return true;
	};
	const validateInputs = () => {
		setError("");
		if (!cvFile) {
			setError("Please upload your CV (PDF or DOCX).");
			return false;
		}
		if (jobDescription.trim().length < MIN_JD_LENGTH) {
			setError(`Please paste a more detailed job description (minimum ${MIN_JD_LENGTH} characters).`);
			return false;
		}
		if (isJobDescriptionTooLong) {
			setError(`The job description is ${jobDescriptionWords.toLocaleString()} words. Please keep it under ${maxJobDescriptionWords.toLocaleString()} words.`);
			return false;
		}
		return true;
	};
	const handleScan = async () => {
		if (!validateInputs()) return;
		setScan(null);
		setUpgrade(null);
		setIsScanning(true);
		try {
			const formData = new FormData();
			formData.append("cv_file", cvFile);
			formData.append("job_description", jobDescription);
			const response = await axios.post("/scan", formData, { headers: { Accept: "application/json" } });
			setScan(response.data);
			setTimeout(() => scanRef.current?.scrollIntoView({
				behavior: "smooth",
				block: "start"
			}), 100);
		} catch (err) {
			setError(errorMessage(err, "Something went wrong while checking your CV. Please try again."));
		} finally {
			setIsScanning(false);
		}
	};
	const handleSubmit = async (event) => {
		event?.preventDefault();
		if (!validateInputs()) {
			window.scrollTo({
				top: 0,
				behavior: "smooth"
			});
			return;
		}
		setUpgrade(null);
		setIsProcessing(true);
		startProgress();
		try {
			const formData = new FormData();
			formData.append("cv_file", cvFile);
			formData.append("job_description", jobDescription);
			if (prefill?.job_posting_id) formData.append("job_posting_id", prefill.job_posting_id);
			const response = await axios.post("/tailor", formData, { headers: { Accept: "application/json" } });
			router.visit(response.data.result_url, { onFinish: () => {
				stopProgress();
				setIsProcessing(false);
			} });
		} catch (err) {
			stopProgress();
			setIsProcessing(false);
			if (showUpgradeIfNeeded(err)) setTimeout(() => upgradeRef.current?.scrollIntoView({
				behavior: "smooth",
				block: "center"
			}), 100);
			else setError(errorMessage(err, "Something went wrong while tailoring your resume. Please try again."));
		}
	};
	return /* @__PURE__ */ jsxs(MainLayout, {
		seo,
		children: [
			/* @__PURE__ */ jsx(Head, { title: "AI Resume Tailor" }),
			/* @__PURE__ */ jsx(NavBar, {}),
			/* @__PURE__ */ jsx("header", {
				className: "rt-hero",
				children: /* @__PURE__ */ jsx("div", {
					className: "container",
					children: /* @__PURE__ */ jsxs("div", {
						className: "row g-4 g-lg-5 align-items-center",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "col-lg-6",
							children: [
								/* @__PURE__ */ jsxs("span", {
									className: "rt-pill mb-3",
									children: [/* @__PURE__ */ jsx("i", { className: "bi bi-stars" }), "AI powered · ATS optimized"]
								}),
								/* @__PURE__ */ jsx("h1", {
									className: "mb-3",
									children: "Tailor your CV to any job and beat the ATS"
								}),
								/* @__PURE__ */ jsx("p", {
									className: "rt-hero-lead mb-4",
									children: "Upload your CV and paste the job description. We score your match, rewrite every section with the job's exact keywords, and give you a clean, single-column resume that every applicant tracking system can read."
								}),
								/* @__PURE__ */ jsxs("ul", {
									className: "rt-hero-points list-unstyled d-grid gap-2 mb-0",
									children: [
										/* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx("i", { className: "bi bi-check-circle-fill" }), "Before & after ATS score with a full breakdown"] }),
										/* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx("i", { className: "bi bi-check-circle-fill" }), "Truthful rewrite. Every added keyword is backed by your CV"] }),
										/* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx("i", { className: "bi bi-check-circle-fill" }), "ATS-safe PDF: no tables, columns, icons or images"] })
									]
								})
							]
						}), /* @__PURE__ */ jsx("div", {
							className: "col-lg-6",
							children: /* @__PURE__ */ jsx("div", {
								className: "rt-card rt-form-card",
								children: /* @__PURE__ */ jsxs("form", {
									className: "p-3 p-sm-4 p-lg-5",
									onSubmit: handleSubmit,
									noValidate: true,
									children: [
										prefill?.job_title && /* @__PURE__ */ jsxs("div", {
											className: "alert alert-info d-flex gap-2 align-items-start py-2 small",
											role: "status",
											children: [/* @__PURE__ */ jsx("i", { className: "bi bi-briefcase mt-1" }), /* @__PURE__ */ jsxs("span", { children: [
												"Tailoring for ",
												/* @__PURE__ */ jsx("strong", { children: prefill.job_title }),
												". The job description is pre-filled below."
											] })]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "mb-4",
											children: [/* @__PURE__ */ jsx("label", {
												className: "form-label fw-semibold",
												children: "1. Upload your CV"
											}), cvFile ? /* @__PURE__ */ jsxs("div", {
												className: "rt-file-chip",
												children: [
													/* @__PURE__ */ jsx("i", { className: "bi bi-file-earmark-text" }),
													/* @__PURE__ */ jsxs("div", {
														className: "flex-grow-1 text-truncate",
														children: [/* @__PURE__ */ jsx("div", {
															className: "fw-semibold text-truncate",
															children: cvFile.name
														}), /* @__PURE__ */ jsxs("small", {
															className: "text-muted",
															children: [(cvFile.size / 1024).toFixed(0), " KB"]
														})]
													}),
													/* @__PURE__ */ jsx("button", {
														type: "button",
														className: "btn btn-sm btn-link text-muted",
														onClick: clearFile,
														disabled: isProcessing,
														"aria-label": "Remove file",
														children: /* @__PURE__ */ jsx("i", { className: "bi bi-x-lg" })
													})
												]
											}) : /* @__PURE__ */ jsxs("label", {
												className: `rt-dropzone ${isDragging ? "is-dragging" : ""}`,
												onDragOver: (event) => {
													event.preventDefault();
													setIsDragging(true);
												},
												onDragLeave: () => setIsDragging(false),
												onDrop: (event) => {
													event.preventDefault();
													setIsDragging(false);
													selectFile(event.dataTransfer.files?.[0]);
												},
												children: [
													/* @__PURE__ */ jsx("input", {
														ref: fileInput,
														type: "file",
														accept: ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
														onChange: (event) => selectFile(event.target.files?.[0])
													}),
													/* @__PURE__ */ jsx("i", { className: "bi bi-cloud-arrow-up rt-dropzone-icon" }),
													/* @__PURE__ */ jsxs("span", {
														className: "fw-semibold",
														children: ["Drop your CV here or ", /* @__PURE__ */ jsx("span", {
															style: { color: "var(--rt-primary)" },
															children: "browse"
														})]
													}),
													/* @__PURE__ */ jsx("small", {
														className: "text-muted",
														children: "PDF or DOCX · up to 5MB"
													})
												]
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "mb-4",
											children: [
												/* @__PURE__ */ jsxs("div", {
													className: "d-flex justify-content-between align-items-end mb-2",
													children: [/* @__PURE__ */ jsx("label", {
														htmlFor: "job-description",
														className: "form-label fw-semibold mb-0",
														children: "2. Paste the job description"
													}), jobDescription && /* @__PURE__ */ jsx("button", {
														type: "button",
														className: "btn btn-link btn-sm p-0 text-muted",
														onClick: () => setJobDescription(""),
														disabled: isProcessing,
														children: "Clear"
													})]
												}),
												/* @__PURE__ */ jsx("textarea", {
													id: "job-description",
													className: "form-control rt-textarea",
													rows: "8",
													placeholder: "Paste the full job description: title, responsibilities, requirements and nice-to-haves...",
													value: jobDescription,
													onChange: (event) => setJobDescription(event.target.value),
													disabled: isProcessing
												}),
												/* @__PURE__ */ jsxs("div", {
													className: "d-flex justify-content-between mt-2",
													children: [/* @__PURE__ */ jsx("small", {
														className: jobDescription.trim().length >= MIN_JD_LENGTH ? "text-success" : "text-muted",
														children: jobDescription.trim().length >= MIN_JD_LENGTH ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("i", { className: "bi bi-check2 me-1" }), "Looks good"] }) : `Min ${MIN_JD_LENGTH} characters`
													}), /* @__PURE__ */ jsxs("small", {
														className: isJobDescriptionTooLong ? "text-danger fw-semibold" : "text-muted",
														children: [
															jobDescriptionWords.toLocaleString(),
															" / ",
															maxJobDescriptionWords.toLocaleString(),
															" words"
														]
													})]
												})
											]
										}),
										error && /* @__PURE__ */ jsxs("div", {
											className: "alert alert-danger d-flex gap-2 align-items-start py-2 rt-fade-in",
											role: "alert",
											children: [/* @__PURE__ */ jsx("i", { className: "bi bi-exclamation-octagon mt-1" }), /* @__PURE__ */ jsx("span", { children: error })]
										}),
										upgrade && /* @__PURE__ */ jsx(UpgradeNotice, {
											upgrade,
											onClose: () => setUpgrade(null),
											innerRef: upgradeRef
										}),
										/* @__PURE__ */ jsx("button", {
											className: "btn rt-btn-primary w-100",
											type: "submit",
											disabled: isProcessing || isScanning,
											children: isProcessing ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("span", {
												className: "spinner-border spinner-border-sm me-2",
												"aria-hidden": "true"
											}), "Tailoring your resume..."] }) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("i", { className: "bi bi-magic me-2" }), "Analyze & tailor my resume"] })
										}),
										/* @__PURE__ */ jsx("button", {
											className: "btn rt-btn-soft w-100 mt-2",
											type: "button",
											onClick: handleScan,
											disabled: isProcessing || isScanning,
											children: isScanning ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("span", {
												className: "spinner-border spinner-border-sm me-2",
												"aria-hidden": "true"
											}), "Checking your CV..."] }) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("i", { className: "bi bi-speedometer2 me-2" }), "Just check my ATS score (free)"] })
										}),
										/* @__PURE__ */ jsx(UsageMeter, { billing })
									]
								})
							})
						})]
					})
				})
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "container pb-5",
				children: [
					isProcessing && /* @__PURE__ */ jsx("section", {
						className: "rt-card rt-overlap rt-fade-in mx-auto",
						style: { maxWidth: "44rem" },
						"aria-live": "polite",
						children: /* @__PURE__ */ jsxs("div", {
							className: "p-4 p-lg-5 rt-card-body",
							children: [
								/* @__PURE__ */ jsxs("div", {
									className: "d-flex justify-content-between align-items-center mb-3 gap-2",
									children: [/* @__PURE__ */ jsxs("h2", {
										className: "rt-card-title",
										children: [/* @__PURE__ */ jsx("i", { className: "bi bi-cpu" }), "AI is tailoring your resume"]
									}), /* @__PURE__ */ jsxs("span", {
										className: "text-muted small text-nowrap",
										children: [
											/* @__PURE__ */ jsx("i", { className: "bi bi-stopwatch me-1" }),
											elapsed,
											"s"
										]
									})]
								}),
								/* @__PURE__ */ jsx("ul", {
									className: "rt-stepper",
									children: STAGES.map((stage, index) => {
										return /* @__PURE__ */ jsxs("li", {
											className: index < progressStage ? "is-done" : index === progressStage ? "is-active" : "",
											children: [/* @__PURE__ */ jsx("span", {
												className: "rt-stepper-dot",
												children: index < progressStage ? /* @__PURE__ */ jsx("i", { className: "bi bi-check-lg" }) : index === progressStage ? /* @__PURE__ */ jsx("span", {
													className: "spinner-border spinner-border-sm text-primary",
													style: {
														width: ".8rem",
														height: ".8rem"
													}
												}) : null
											}), stage.label]
										}, stage.label);
									})
								}),
								/* @__PURE__ */ jsxs("p", {
									className: "text-muted small mb-0 mt-3",
									children: [/* @__PURE__ */ jsx("i", { className: "bi bi-info-circle me-1" }), "This usually takes 20 to 60 seconds."]
								})
							]
						})
					}),
					scan && !isProcessing && /* @__PURE__ */ jsx("div", {
						ref: scanRef,
						style: { scrollMarginTop: "5rem" },
						children: /* @__PURE__ */ jsx(ScanReport, {
							scan,
							isProcessing,
							onTailor: () => handleSubmit()
						})
					}),
					!scan && !isProcessing && /* @__PURE__ */ jsx("section", {
						id: "how-it-works",
						className: "rt-overlap",
						style: { scrollMarginTop: "5rem" },
						children: /* @__PURE__ */ jsx("div", {
							className: "row g-3 g-lg-4",
							children: [
								[
									"bi-upload",
									"Upload & paste",
									"Add your current CV (PDF or DOCX) and the job description you are applying for."
								],
								[
									"bi-speedometer2",
									"Get your ATS score",
									"We extract the keywords recruiters filter by and score your CV the way an ATS ranks it."
								],
								[
									"bi-magic",
									"Download the tailored CV",
									"Every section is rewritten with the job's exact keywords, re-scored, and exported as an ATS-safe PDF."
								]
							].map(([icon, title, text], index) => /* @__PURE__ */ jsx("div", {
								className: "col-md-4",
								children: /* @__PURE__ */ jsxs("div", {
									className: "rt-card rt-step",
									children: [
										/* @__PURE__ */ jsx("div", {
											className: "rt-step-icon",
											children: /* @__PURE__ */ jsx("i", { className: `bi ${icon}` })
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "rt-step-number mb-1",
											children: ["Step ", index + 1]
										}),
										/* @__PURE__ */ jsx("h3", {
											className: "h6 fw-bold mb-2",
											children: title
										}),
										/* @__PURE__ */ jsx("p", {
											className: "text-muted small mb-0",
											children: text
										})
									]
								})
							}, title))
						})
					})
				]
			})
		]
	});
}
//#endregion
//#region resources/js/Pages/Resumes/Index.jsx
var Index_exports$2 = /* @__PURE__ */ __exportAll({ default: () => Index });
var ALLOWED_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
var MAX_FILE_BYTES = 5242880;
function Index({ resumes }) {
	const { data, setData, post, processing, errors, reset } = useForm({
		cv_file: null,
		is_primary: resumes.length === 0
	});
	const [clientError, setClientError] = useState("");
	const fileInput = useRef(null);
	const selectFile = (file) => {
		setClientError("");
		if (!file) return;
		if (!ALLOWED_TYPES.includes(file.type) && !/\.(pdf|docx)$/i.test(file.name)) {
			setClientError("Please upload your CV as a PDF or DOCX file.");
			return;
		}
		if (file.size > MAX_FILE_BYTES) {
			setClientError("File size must be under 5MB.");
			return;
		}
		setData("cv_file", file);
	};
	const submit = (event) => {
		event.preventDefault();
		post("/resumes", {
			forceFormData: true,
			preserveScroll: true,
			onSuccess: () => {
				reset();
				setData("is_primary", false);
				if (fileInput.current) fileInput.current.value = "";
			}
		});
	};
	const makePrimary = (resume) => {
		router.patch(`/resumes/${resume.id}`, {}, { preserveScroll: true });
	};
	const remove = (resume) => {
		if (window.confirm(`Delete ${resume.original_filename}?`)) router.delete(`/resumes/${resume.id}`, { preserveScroll: true });
	};
	return /* @__PURE__ */ jsxs(AuthLayout, {
		title: "Your resumes",
		subtitle: "Upload the CVs you want to scan jobs against. The primary CV is used automatically.",
		children: [
			/* @__PURE__ */ jsx(Head, { title: "Your resumes" }),
			/* @__PURE__ */ jsxs("form", {
				onSubmit: submit,
				noValidate: true,
				className: "mb-4",
				children: [
					/* @__PURE__ */ jsx("label", {
						htmlFor: "cv_file",
						className: "form-label fw-semibold",
						children: "Add a resume"
					}),
					/* @__PURE__ */ jsx("input", {
						id: "cv_file",
						ref: fileInput,
						type: "file",
						accept: ".pdf,.docx",
						className: `form-control ${clientError || errors.cv_file ? "is-invalid" : ""}`,
						onChange: (event) => selectFile(event.target.files?.[0])
					}),
					(clientError || errors.cv_file) && /* @__PURE__ */ jsx("div", {
						className: "invalid-feedback",
						children: clientError || errors.cv_file
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "form-check mt-3",
						children: [/* @__PURE__ */ jsx("input", {
							id: "is_primary",
							type: "checkbox",
							className: "form-check-input",
							checked: data.is_primary,
							onChange: (event) => setData("is_primary", event.target.checked)
						}), /* @__PURE__ */ jsx("label", {
							htmlFor: "is_primary",
							className: "form-check-label small",
							children: "Use as my primary CV"
						})]
					}),
					/* @__PURE__ */ jsx("button", {
						type: "submit",
						className: "btn btn-primary mt-3",
						disabled: processing || !data.cv_file,
						children: processing ? "Uploading..." : "Upload resume"
					})
				]
			}),
			/* @__PURE__ */ jsx("hr", { className: "my-4" }),
			resumes.length === 0 ? /* @__PURE__ */ jsx("p", {
				className: "text-muted small mb-0",
				children: "No resumes yet. Upload a PDF or DOCX to get started."
			}) : /* @__PURE__ */ jsx("ul", {
				className: "list-unstyled d-grid gap-2 mb-0",
				children: resumes.map((resume) => /* @__PURE__ */ jsxs("li", {
					className: "rt-file-chip",
					children: [
						/* @__PURE__ */ jsx("i", { className: "bi bi-file-earmark-text" }),
						/* @__PURE__ */ jsxs("div", {
							className: "flex-grow-1 text-truncate",
							children: [/* @__PURE__ */ jsxs("div", {
								className: "fw-semibold text-truncate",
								children: [resume.original_filename, resume.is_primary && /* @__PURE__ */ jsx("span", {
									className: "badge text-bg-primary ms-2",
									children: "Primary"
								})]
							}), /* @__PURE__ */ jsxs("small", {
								className: "text-muted",
								children: [
									resume.characters.toLocaleString(),
									" characters",
									resume.created_at ? ` · added ${new Date(resume.created_at).toLocaleDateString()}` : ""
								]
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "d-flex gap-1",
							children: [!resume.is_primary && /* @__PURE__ */ jsx("button", {
								type: "button",
								className: "btn btn-sm btn-outline-secondary",
								onClick: () => makePrimary(resume),
								title: "Make primary",
								children: /* @__PURE__ */ jsx("i", { className: "bi bi-star" })
							}), /* @__PURE__ */ jsx("button", {
								type: "button",
								className: "btn btn-sm btn-outline-danger",
								onClick: () => remove(resume),
								title: "Delete",
								children: /* @__PURE__ */ jsx("i", { className: "bi bi-trash" })
							})]
						})
					]
				}, resume.id))
			}),
			/* @__PURE__ */ jsx("p", {
				className: "text-center text-muted small mt-4 mb-0",
				children: /* @__PURE__ */ jsx(Link, {
					href: "/jobs",
					children: "Scan jobs with your primary CV"
				})
			})
		]
	});
}
//#endregion
//#region resources/js/Pages/SavedJobs/Index.jsx
var Index_exports$1 = /* @__PURE__ */ __exportAll({ default: () => SavedJobsIndex });
var formatDate = (value) => {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString(void 0, {
		month: "short",
		day: "numeric"
	});
};
var statusTone = {
	saved: "secondary",
	applied: "info",
	interviewing: "warning",
	rejected: "danger",
	offer: "success"
};
function SavedJobsIndex({ savedJobs, statuses, seo }) {
	const updateStatus = (savedJob, status) => {
		router.patch(`/saved-jobs/${savedJob.id}`, { status }, { preserveScroll: true });
	};
	const remove = (savedJob) => {
		if (window.confirm(`Remove "${savedJob.job.title}" from your saved jobs?`)) router.delete(`/saved-jobs/${savedJob.id}`, { preserveScroll: true });
	};
	return /* @__PURE__ */ jsxs(MainLayout, {
		seo,
		children: [/* @__PURE__ */ jsx(NavBar, {}), /* @__PURE__ */ jsxs("div", {
			className: "container py-4 py-lg-5",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "d-flex flex-wrap justify-content-between align-items-end gap-2 mb-4",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("h1", {
					className: "h4 fw-bold mb-1",
					children: [/* @__PURE__ */ jsx("i", {
						className: "bi bi-bookmark-star me-2",
						style: { color: "var(--rt-primary)" }
					}), "Saved jobs"]
				}), /* @__PURE__ */ jsx("p", {
					className: "text-muted small mb-0",
					children: "Track each application from saved through to offer."
				})] }), /* @__PURE__ */ jsxs(Link, {
					href: "/jobs",
					className: "btn rt-btn-soft",
					children: [/* @__PURE__ */ jsx("i", { className: "bi bi-search me-2" }), "Find more jobs"]
				})]
			}), savedJobs.length === 0 ? /* @__PURE__ */ jsxs("section", {
				className: "rt-card p-5 text-center",
				children: [
					/* @__PURE__ */ jsx("i", {
						className: "bi bi-bookmark",
						style: {
							fontSize: "2rem",
							color: "var(--rt-muted)"
						}
					}),
					/* @__PURE__ */ jsx("h2", {
						className: "h6 fw-bold mt-3",
						children: "No saved jobs yet"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "text-muted small mb-3",
						children: "Save a posting from the job list to start tracking it here."
					}),
					/* @__PURE__ */ jsx(Link, {
						href: "/jobs",
						className: "btn rt-btn-primary",
						children: "Browse jobs"
					})
				]
			}) : /* @__PURE__ */ jsx("div", {
				className: "d-grid gap-3",
				children: savedJobs.map((savedJob) => /* @__PURE__ */ jsx("article", {
					className: "rt-card p-3 p-sm-4",
					children: /* @__PURE__ */ jsxs("div", {
						className: "d-flex flex-column flex-lg-row justify-content-between gap-3",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "flex-grow-1 min-w-0",
							children: [/* @__PURE__ */ jsxs("div", {
								className: "d-flex flex-wrap align-items-center gap-2 mb-1",
								children: [/* @__PURE__ */ jsx("h2", {
									className: "h6 fw-bold mb-0",
									children: /* @__PURE__ */ jsx(Link, {
										href: savedJob.job.url,
										className: "text-decoration-none",
										style: { color: "var(--rt-ink)" },
										children: savedJob.job.title
									})
								}), /* @__PURE__ */ jsx("span", {
									className: `badge text-bg-${statusTone[savedJob.status] || "secondary"}`,
									children: statuses.find((status) => status.value === savedJob.status)?.label || savedJob.status
								})]
							}), /* @__PURE__ */ jsxs("div", {
								className: "rt-job-meta",
								children: [
									savedJob.job.company && /* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("i", { className: "bi bi-building" }), savedJob.job.company] }),
									savedJob.job.location && /* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("i", { className: "bi bi-geo-alt" }), savedJob.job.location] }),
									savedJob.job.is_remote && /* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("i", { className: "bi bi-house-door" }), "Remote"] }),
									savedJob.job.source && /* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("i", { className: "bi bi-broadcast" }), savedJob.job.source] }),
									formatDate(savedJob.updated_at) && /* @__PURE__ */ jsxs("span", { children: [
										/* @__PURE__ */ jsx("i", { className: "bi bi-clock" }),
										"Updated ",
										formatDate(savedJob.updated_at)
									] })
								]
							})]
						}), /* @__PURE__ */ jsxs("div", {
							className: "d-flex flex-wrap align-items-center gap-2",
							children: [
								/* @__PURE__ */ jsx("label", {
									className: "visually-hidden",
									htmlFor: `status-${savedJob.id}`,
									children: "Application status"
								}),
								/* @__PURE__ */ jsx("select", {
									id: `status-${savedJob.id}`,
									className: "form-select form-select-sm rt-input",
									style: { width: "11rem" },
									value: savedJob.status,
									onChange: (event) => updateStatus(savedJob, event.target.value),
									children: statuses.map((status) => /* @__PURE__ */ jsx("option", {
										value: status.value,
										children: status.label
									}, status.value))
								}),
								/* @__PURE__ */ jsx(Link, {
									href: savedJob.job.url,
									className: "btn btn-sm rt-btn-soft",
									children: "View job"
								}),
								/* @__PURE__ */ jsxs("button", {
									type: "button",
									className: "btn btn-sm btn-outline-danger",
									onClick: () => remove(savedJob),
									children: [/* @__PURE__ */ jsx("i", { className: "bi bi-trash" }), /* @__PURE__ */ jsx("span", {
										className: "visually-hidden",
										children: "Remove"
									})]
								})
							]
						})]
					})
				}, savedJob.id))
			})]
		})]
	});
}
//#endregion
//#region resources/js/Pages/SavedSearches/Index.jsx
var Index_exports = /* @__PURE__ */ __exportAll({ default: () => SavedSearchesIndex });
var EMPLOYMENT_TYPES = [
	"full_time",
	"part_time",
	"contract",
	"temporary",
	"internship"
];
var label = (value) => value.replace("_", " ");
var formatDateTime = (value) => {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date.toLocaleString(void 0, {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit"
	});
};
var filterSummary = (search) => {
	const filters = search.filters || {};
	const parts = [];
	if (search.query) parts.push(`"${search.query}"`);
	if (filters.location) parts.push(filters.location);
	if (filters.remote) parts.push("Remote");
	if (filters.employment_type) parts.push(label(filters.employment_type));
	if (filters.salary_min || filters.salary_max) parts.push(`Salary ${filters.salary_min || "0"} - ${filters.salary_max || "any"}`);
	if (filters.posted_within_days) parts.push(`Posted in last ${filters.posted_within_days} days`);
	return parts.length > 0 ? parts.join(" · ") : "All active jobs";
};
function SavedSearchesIndex({ searches, defaultMinScore, seo }) {
	const form = useForm({
		name: "",
		query: "",
		location: "",
		remote: false,
		employment_type: "",
		salary_min: "",
		salary_max: "",
		posted_within_days: "",
		min_score: defaultMinScore,
		alerts_enabled: true
	});
	const submit = (event) => {
		event.preventDefault();
		form.post("/saved-searches", {
			preserveScroll: true,
			onSuccess: () => form.reset()
		});
	};
	const toggleAlerts = (search, enabled) => {
		router.patch(`/saved-searches/${search.id}`, {
			name: search.name,
			query: search.query,
			filters: search.filters,
			min_score: search.min_score,
			alerts_enabled: enabled
		}, { preserveScroll: true });
	};
	const runNow = (search) => {
		router.post(`/saved-searches/${search.id}/run`, {}, { preserveScroll: true });
	};
	const remove = (search) => {
		if (window.confirm(`Delete the saved search "${search.name}"?`)) router.delete(`/saved-searches/${search.id}`, { preserveScroll: true });
	};
	return /* @__PURE__ */ jsxs(MainLayout, {
		seo,
		children: [/* @__PURE__ */ jsx(NavBar, {}), /* @__PURE__ */ jsxs("div", {
			className: "container py-4 py-lg-5",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "d-flex flex-wrap justify-content-between align-items-end gap-2 mb-4",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("h1", {
					className: "h4 fw-bold mb-1",
					children: [/* @__PURE__ */ jsx("i", {
						className: "bi bi-bell me-2",
						style: { color: "var(--rt-primary)" }
					}), "Saved searches"]
				}), /* @__PURE__ */ jsx("p", {
					className: "text-muted small mb-0",
					children: "We re-run these searches and email you when new jobs match."
				})] }), /* @__PURE__ */ jsxs(Link, {
					href: "/jobs",
					className: "btn rt-btn-soft",
					children: [/* @__PURE__ */ jsx("i", { className: "bi bi-search me-2" }), "Search jobs"]
				})]
			}), /* @__PURE__ */ jsxs("div", {
				className: "row g-4",
				children: [/* @__PURE__ */ jsx("div", {
					className: "col-lg-5",
					children: /* @__PURE__ */ jsxs("section", {
						className: "rt-card p-4",
						children: [/* @__PURE__ */ jsxs("h2", {
							className: "h6 fw-bold mb-3",
							children: [/* @__PURE__ */ jsx("i", { className: "bi bi-plus-circle me-2" }), "New saved search"]
						}), /* @__PURE__ */ jsxs("form", {
							onSubmit: submit,
							className: "d-grid gap-3",
							children: [
								/* @__PURE__ */ jsxs("div", { children: [
									/* @__PURE__ */ jsx("label", {
										className: "rt-filter-label d-block mb-1",
										htmlFor: "saved-name",
										children: "Name"
									}),
									/* @__PURE__ */ jsx("input", {
										id: "saved-name",
										className: "form-control rt-input",
										value: form.data.name,
										onChange: (event) => form.setData("name", event.target.value),
										placeholder: "Remote Laravel roles"
									}),
									form.errors.name && /* @__PURE__ */ jsx("small", {
										className: "text-danger",
										children: form.errors.name
									})
								] }),
								/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
									className: "rt-filter-label d-block mb-1",
									htmlFor: "saved-query",
									children: "Keywords"
								}), /* @__PURE__ */ jsx("input", {
									id: "saved-query",
									className: "form-control rt-input",
									value: form.data.query,
									onChange: (event) => form.setData("query", event.target.value),
									placeholder: "Laravel, backend..."
								})] }),
								/* @__PURE__ */ jsxs("div", {
									className: "row g-2",
									children: [/* @__PURE__ */ jsxs("div", {
										className: "col-sm-6",
										children: [/* @__PURE__ */ jsx("label", {
											className: "rt-filter-label d-block mb-1",
											htmlFor: "saved-location",
											children: "Location"
										}), /* @__PURE__ */ jsx("input", {
											id: "saved-location",
											className: "form-control rt-input",
											value: form.data.location,
											onChange: (event) => form.setData("location", event.target.value),
											placeholder: "Berlin"
										})]
									}), /* @__PURE__ */ jsxs("div", {
										className: "col-sm-6",
										children: [/* @__PURE__ */ jsx("label", {
											className: "rt-filter-label d-block mb-1",
											htmlFor: "saved-employment",
											children: "Employment type"
										}), /* @__PURE__ */ jsxs("select", {
											id: "saved-employment",
											className: "form-select rt-input",
											value: form.data.employment_type,
											onChange: (event) => form.setData("employment_type", event.target.value),
											children: [/* @__PURE__ */ jsx("option", {
												value: "",
												children: "Any"
											}), EMPLOYMENT_TYPES.map((type) => /* @__PURE__ */ jsx("option", {
												value: type,
												children: label(type)
											}, type))]
										})]
									})]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "row g-2",
									children: [/* @__PURE__ */ jsxs("div", {
										className: "col-sm-6",
										children: [/* @__PURE__ */ jsx("label", {
											className: "rt-filter-label d-block mb-1",
											htmlFor: "saved-salary-min",
											children: "Minimum salary"
										}), /* @__PURE__ */ jsx("input", {
											id: "saved-salary-min",
											type: "number",
											min: "0",
											className: "form-control rt-input",
											value: form.data.salary_min,
											onChange: (event) => form.setData("salary_min", event.target.value),
											placeholder: "50000"
										})]
									}), /* @__PURE__ */ jsxs("div", {
										className: "col-sm-6",
										children: [/* @__PURE__ */ jsx("label", {
											className: "rt-filter-label d-block mb-1",
											htmlFor: "saved-salary-max",
											children: "Maximum salary"
										}), /* @__PURE__ */ jsx("input", {
											id: "saved-salary-max",
											type: "number",
											min: "0",
											className: "form-control rt-input",
											value: form.data.salary_max,
											onChange: (event) => form.setData("salary_max", event.target.value),
											placeholder: "120000"
										})]
									})]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "row g-2",
									children: [/* @__PURE__ */ jsxs("div", {
										className: "col-sm-6",
										children: [/* @__PURE__ */ jsx("label", {
											className: "rt-filter-label d-block mb-1",
											htmlFor: "saved-posted",
											children: "Posted within"
										}), /* @__PURE__ */ jsxs("select", {
											id: "saved-posted",
											className: "form-select rt-input",
											value: form.data.posted_within_days,
											onChange: (event) => form.setData("posted_within_days", event.target.value),
											children: [
												/* @__PURE__ */ jsx("option", {
													value: "",
													children: "Any time"
												}),
												/* @__PURE__ */ jsx("option", {
													value: "1",
													children: "Last 24 hours"
												}),
												/* @__PURE__ */ jsx("option", {
													value: "3",
													children: "Last 3 days"
												}),
												/* @__PURE__ */ jsx("option", {
													value: "7",
													children: "Last 7 days"
												}),
												/* @__PURE__ */ jsx("option", {
													value: "14",
													children: "Last 14 days"
												}),
												/* @__PURE__ */ jsx("option", {
													value: "30",
													children: "Last 30 days"
												})
											]
										})]
									}), /* @__PURE__ */ jsxs("div", {
										className: "col-sm-6",
										children: [/* @__PURE__ */ jsx("label", {
											className: "rt-filter-label d-block mb-1",
											htmlFor: "saved-min-score",
											children: "Minimum match"
										}), /* @__PURE__ */ jsxs("div", {
											className: "input-group",
											children: [/* @__PURE__ */ jsx("input", {
												id: "saved-min-score",
												type: "number",
												min: "0",
												max: "100",
												className: "form-control rt-input",
												value: form.data.min_score,
												onChange: (event) => form.setData("min_score", event.target.value)
											}), /* @__PURE__ */ jsx("span", {
												className: "input-group-text",
												children: "%"
											})]
										})]
									})]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "form-check",
									children: [/* @__PURE__ */ jsx("input", {
										id: "saved-remote",
										className: "form-check-input",
										type: "checkbox",
										checked: form.data.remote,
										onChange: (event) => form.setData("remote", event.target.checked)
									}), /* @__PURE__ */ jsx("label", {
										className: "form-check-label small",
										htmlFor: "saved-remote",
										children: "Remote only"
									})]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "form-check",
									children: [/* @__PURE__ */ jsx("input", {
										id: "saved-alerts",
										className: "form-check-input",
										type: "checkbox",
										checked: form.data.alerts_enabled,
										onChange: (event) => form.setData("alerts_enabled", event.target.checked)
									}), /* @__PURE__ */ jsx("label", {
										className: "form-check-label small",
										htmlFor: "saved-alerts",
										children: "Email me when new jobs match"
									})]
								}),
								/* @__PURE__ */ jsx("button", {
									className: "btn rt-btn-primary",
									type: "submit",
									disabled: form.processing,
									children: form.processing ? "Saving..." : "Save search"
								})
							]
						})]
					})
				}), /* @__PURE__ */ jsx("div", {
					className: "col-lg-7",
					children: searches.length === 0 ? /* @__PURE__ */ jsxs("section", {
						className: "rt-card p-5 text-center",
						children: [
							/* @__PURE__ */ jsx("i", {
								className: "bi bi-bell-slash",
								style: {
									fontSize: "2rem",
									color: "var(--rt-muted)"
								}
							}),
							/* @__PURE__ */ jsx("h2", {
								className: "h6 fw-bold mt-3",
								children: "No saved searches yet"
							}),
							/* @__PURE__ */ jsx("p", {
								className: "text-muted small mb-0",
								children: "Create one here, or save your current filters from the jobs page."
							})
						]
					}) : /* @__PURE__ */ jsx("div", {
						className: "d-grid gap-3",
						children: searches.map((search) => /* @__PURE__ */ jsxs("article", {
							className: "rt-card p-3 p-sm-4",
							children: [/* @__PURE__ */ jsxs("div", {
								className: "d-flex flex-wrap justify-content-between gap-2",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "flex-grow-1 min-w-0",
									children: [
										/* @__PURE__ */ jsxs("div", {
											className: "d-flex flex-wrap align-items-center gap-2 mb-1",
											children: [
												/* @__PURE__ */ jsx("h2", {
													className: "h6 fw-bold mb-0",
													children: search.name
												}),
												/* @__PURE__ */ jsxs("span", {
													className: "badge text-bg-light border",
													children: [
														"Min ",
														search.min_score,
														"%"
													]
												}),
												!search.alerts_enabled && /* @__PURE__ */ jsx("span", {
													className: "badge text-bg-secondary",
													children: "Alerts off"
												})
											]
										}),
										/* @__PURE__ */ jsx("p", {
											className: "text-muted small mb-1",
											children: filterSummary(search)
										}),
										/* @__PURE__ */ jsx("small", {
											className: "text-muted",
											children: search.last_run_at ? `Last run ${formatDateTime(search.last_run_at)}` : "Never run"
										})
									]
								}), /* @__PURE__ */ jsxs("div", {
									className: "d-flex flex-wrap align-items-start gap-2",
									children: [/* @__PURE__ */ jsxs("button", {
										type: "button",
										className: "btn btn-sm rt-btn-soft",
										onClick: () => runNow(search),
										children: [/* @__PURE__ */ jsx("i", { className: "bi bi-play-fill me-1" }), "Run now"]
									}), /* @__PURE__ */ jsxs("button", {
										type: "button",
										className: "btn btn-sm btn-outline-danger",
										onClick: () => remove(search),
										children: [/* @__PURE__ */ jsx("i", { className: "bi bi-trash" }), /* @__PURE__ */ jsx("span", {
											className: "visually-hidden",
											children: "Delete"
										})]
									})]
								})]
							}), /* @__PURE__ */ jsxs("div", {
								className: "form-check form-switch mt-3 mb-0",
								children: [/* @__PURE__ */ jsx("input", {
									id: `alerts-${search.id}`,
									className: "form-check-input",
									type: "checkbox",
									role: "switch",
									checked: search.alerts_enabled,
									onChange: (event) => toggleAlerts(search, event.target.checked)
								}), /* @__PURE__ */ jsx("label", {
									className: "form-check-label small",
									htmlFor: `alerts-${search.id}`,
									children: "Email alerts"
								})]
							})]
						}, search.id))
					})
				})]
			})]
		})]
	});
}
//#endregion
//#region resources/js/Pages/TailoredResume.jsx
var TailoredResume_exports = /* @__PURE__ */ __exportAll({ default: () => TailoredResume });
/**
* One tailored resume on its own page: before and after scores, keywords, confirm-missing-skills,
* the design picker, preview and download. Opened in the same tab right after tailoring.
*/
function TailoredResume({ result: initialResult, templates = [], seo }) {
	const { billing } = usePage().props;
	const isPro = billing?.plan === "pro";
	const [result, setResult] = useState(initialResult);
	const [keywordTab, setKeywordTab] = useState(initialResult.added_keywords.length > 0 ? "added" : "missing");
	const [previewTab, setPreviewTab] = useState("formatted");
	const [selectedSkills, setSelectedSkills] = useState([]);
	const [customSkill, setCustomSkill] = useState("");
	const [isRefining, setIsRefining] = useState(false);
	const [refineError, setRefineError] = useState("");
	const [toast, setToast] = useState("");
	const [isSwitchingTemplate, setIsSwitchingTemplate] = useState(false);
	const [templateError, setTemplateError] = useState("");
	const [upgrade, setUpgrade] = useState(null);
	useEffect(() => {
		if (!toast) return;
		const timeout = setTimeout(() => setToast(""), 2600);
		return () => clearTimeout(timeout);
	}, [toast]);
	const keptKeywords = useMemo(() => {
		const added = new Set(result.added_keywords.map((keyword) => keyword.term));
		return result.tailored_score.matched.filter((keyword) => !added.has(keyword.term));
	}, [result]);
	const showResult = (data) => {
		setResult(data);
		setSelectedSkills([]);
		setCustomSkill("");
		setKeywordTab(data.added_keywords.length > 0 ? "added" : "missing");
	};
	const toggleSkill = (term) => {
		setSelectedSkills((prev) => prev.includes(term) ? prev.filter((skill) => skill !== term) : [...prev, term]);
	};
	const addCustomSkill = (event) => {
		event.preventDefault();
		const skill = customSkill.trim();
		if (skill && !selectedSkills.some((existing) => existing.toLowerCase() === skill.toLowerCase())) setSelectedSkills((prev) => [...prev, skill]);
		setCustomSkill("");
	};
	const handleRefine = async () => {
		if (selectedSkills.length === 0) return;
		setRefineError("");
		setIsRefining(true);
		const previousScore = result.tailored_score.score;
		try {
			const response = await axios.post(result.refine_url, { confirmed_skills: selectedSkills }, { headers: { Accept: "application/json" } });
			showResult(response.data);
			const gained = response.data.tailored_score.score - previousScore;
			setToast(gained > 0 ? `Score improved by ${gained} points` : "Resume updated with your confirmed skills");
		} catch (err) {
			setRefineError(errorMessage(err, "Could not update the resume. Please try again."));
		} finally {
			setIsRefining(false);
		}
	};
	const changeTemplate = async (value) => {
		if (value === result.template || isSwitchingTemplate) return;
		const chosen = templates.find((option) => option.value === value);
		if (!isPro && chosen?.premium) {
			setUpgrade({
				message: `The ${chosen.label} design is part of Pro. Choose a free design or upgrade to use it.`,
				url: "/pricing"
			});
			return;
		}
		setUpgrade(null);
		setTemplateError("");
		setIsSwitchingTemplate(true);
		try {
			const response = await axios.post(result.template_url, { template: value }, { headers: { Accept: "application/json" } });
			setResult((previous) => ({
				...previous,
				...response.data
			}));
			setPreviewTab("formatted");
			setToast(`Design changed to ${chosen?.label ?? value}`);
		} catch (err) {
			if (err?.response?.status === 402) setUpgrade({
				message: err.response.data?.message,
				url: err.response.data?.upgrade_url
			});
			else setTemplateError(errorMessage(err, "Could not change the design. Please try again."));
		} finally {
			setIsSwitchingTemplate(false);
		}
	};
	const copyPlainText = async () => {
		try {
			await navigator.clipboard.writeText(result.plain_text);
			setToast("Plain-text resume copied to clipboard");
		} catch {
			setToast("Copy failed. Select the text in the \"ATS plain text\" tab instead.");
		}
	};
	const delta = result.tailored_score.score - result.original_score.score;
	const missingTotal = result.tailored_score.missing_total ?? result.tailored_score.missing.length;
	const unverifiedCount = result.added_keywords.filter((keyword) => !keyword.evidence).length;
	return /* @__PURE__ */ jsxs(MainLayout, {
		seo,
		children: [
			/* @__PURE__ */ jsx(Head, { title: "Your tailored resume" }),
			/* @__PURE__ */ jsx(NavBar, {}),
			/* @__PURE__ */ jsx("header", {
				className: "rt-hero rt-hero-compact",
				children: /* @__PURE__ */ jsxs("div", {
					className: "container",
					children: [
						/* @__PURE__ */ jsxs("span", {
							className: "rt-pill mb-3",
							children: [/* @__PURE__ */ jsx("i", { className: "bi bi-patch-check" }), "Tailored and re-scored"]
						}),
						/* @__PURE__ */ jsx("h1", {
							className: "mb-2",
							children: "Your ATS-optimized resume is ready"
						}),
						result.job_title && /* @__PURE__ */ jsxs("p", {
							className: "rt-hero-lead mb-0",
							children: ["Tailored for ", /* @__PURE__ */ jsx("strong", {
								className: "text-white",
								children: result.job_title
							})]
						})
					]
				})
			}),
			/* @__PURE__ */ jsx("div", {
				className: "container pb-5",
				children: /* @__PURE__ */ jsxs("div", {
					className: "rt-overlap d-grid gap-4 rt-fade-in",
					style: {
						scrollMarginTop: "5rem",
						gridTemplateColumns: "minmax(0, 1fr)"
					},
					children: [
						/* @__PURE__ */ jsx("section", {
							className: "rt-card",
							children: /* @__PURE__ */ jsx("div", {
								className: "p-4 p-lg-5 rt-card-body",
								children: /* @__PURE__ */ jsxs("div", {
									className: "row g-4 align-items-center",
									children: [/* @__PURE__ */ jsx("div", {
										className: "col-lg-5",
										children: /* @__PURE__ */ jsxs("div", {
											className: "d-flex align-items-center justify-content-center gap-2 gap-sm-3",
											children: [
												/* @__PURE__ */ jsx("div", {
													className: "rt-gauge-slot",
													children: /* @__PURE__ */ jsx(ScoreGauge, {
														score: result.original_score.score,
														caption: "Your CV"
													})
												}),
												/* @__PURE__ */ jsx("div", {
													className: "rt-arrow flex-shrink-0",
													children: /* @__PURE__ */ jsx("i", { className: "bi bi-arrow-right" })
												}),
												/* @__PURE__ */ jsx("div", {
													className: "rt-gauge-slot",
													children: /* @__PURE__ */ jsx(ScoreGauge, {
														score: result.tailored_score.score,
														caption: "Tailored"
													})
												})
											]
										})
									}), /* @__PURE__ */ jsxs("div", {
										className: "col-lg-7",
										children: [
											/* @__PURE__ */ jsxs("div", {
												className: "d-flex flex-wrap align-items-center gap-2 mb-2",
												children: [/* @__PURE__ */ jsxs("span", {
													className: `rt-delta ${delta > 0 ? "" : "is-flat"}`,
													children: [/* @__PURE__ */ jsx("i", { className: `bi ${delta > 0 ? "bi-graph-up-arrow" : "bi-dash"}` }), delta > 0 ? `+${delta} points` : "No change"]
												}), result.job_title && /* @__PURE__ */ jsx("span", {
													className: "badge rounded-pill text-bg-light border",
													children: result.job_title
												})]
											}),
											/* @__PURE__ */ jsx("h2", {
												className: "h4 fw-bold mb-2",
												children: "Before and after"
											}),
											/* @__PURE__ */ jsxs("p", {
												className: `text-muted ${result.tailored_score.cap_reason ? "mb-2" : "mb-4"}`,
												children: [
													"Now matching ",
													/* @__PURE__ */ jsx("strong", { children: result.tailored_score.matched.length }),
													" of",
													" ",
													/* @__PURE__ */ jsx("strong", { children: result.tailored_score.matched.length + missingTotal }),
													" job keywords, including",
													" ",
													/* @__PURE__ */ jsxs("strong", { children: [
														result.tailored_score.required_matched,
														"/",
														result.tailored_score.required_total
													] }),
													" required ones."
												]
											}),
											result.tailored_score.cap_reason && /* @__PURE__ */ jsxs("p", {
												className: "text-muted small mb-4",
												children: [/* @__PURE__ */ jsx("i", { className: "bi bi-info-circle me-1" }), result.tailored_score.cap_reason]
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "d-flex flex-wrap gap-2 rt-actions",
												children: [
													/* @__PURE__ */ jsxs("a", {
														className: "btn btn-success rt-btn-success px-4",
														href: result.download_url,
														children: [/* @__PURE__ */ jsx("i", { className: "bi bi-file-earmark-arrow-down me-2" }), "Download PDF"]
													}),
													/* @__PURE__ */ jsxs("button", {
														type: "button",
														className: "btn rt-btn-soft px-3",
														onClick: copyPlainText,
														children: [/* @__PURE__ */ jsx("i", { className: "bi bi-clipboard me-2" }), "Copy text"]
													}),
													/* @__PURE__ */ jsxs(Link, {
														href: "/",
														className: "btn btn-outline-secondary px-3",
														style: { borderRadius: ".7rem" },
														children: [/* @__PURE__ */ jsx("i", { className: "bi bi-plus-lg me-2" }), "Tailor another CV"]
													})
												]
											})
										]
									})]
								})
							})
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "row g-4",
							children: [/* @__PURE__ */ jsx("div", {
								className: "col-lg-5",
								children: /* @__PURE__ */ jsx("section", {
									className: "rt-card h-100",
									children: /* @__PURE__ */ jsxs("div", {
										className: "p-4 rt-card-body",
										children: [
											/* @__PURE__ */ jsxs("h2", {
												className: "rt-card-title mb-1",
												children: [/* @__PURE__ */ jsx("i", { className: "bi bi-bar-chart-line" }), "Score breakdown"]
											}),
											/* @__PURE__ */ jsx("p", {
												className: "text-muted small mb-2",
												children: "Grey = your CV, colour = tailored resume."
											}),
											BREAKDOWN_ORDER$1.filter((key) => result.tailored_score.breakdown[key]).map((key) => [key, result.tailored_score.breakdown[key]]).map(([key, metric]) => /* @__PURE__ */ jsxs("div", {
												className: "rt-metric",
												children: [
													/* @__PURE__ */ jsxs("div", {
														className: "d-flex justify-content-between align-items-center mb-2 gap-2",
														children: [/* @__PURE__ */ jsxs("span", {
															className: "fw-semibold",
															children: [
																metric.label,
																" ",
																/* @__PURE__ */ jsxs("span", {
																	className: "rt-weight ms-1",
																	children: [metric.weight, "%"]
																})
															]
														}), /* @__PURE__ */ jsxs("span", {
															className: "small fw-semibold text-nowrap",
															children: [
																/* @__PURE__ */ jsx("span", {
																	className: "text-muted",
																	children: result.original_score.breakdown[key].score
																}),
																/* @__PURE__ */ jsx("i", { className: "bi bi-arrow-right mx-1 text-muted" }),
																/* @__PURE__ */ jsx("span", {
																	style: { color: toneColor$1[scoreTone$1(metric.score)] },
																	children: metric.score
																})
															]
														})]
													}),
													/* @__PURE__ */ jsxs("div", {
														className: "d-grid gap-1",
														children: [/* @__PURE__ */ jsx(Bar, {
															value: result.original_score.breakdown[key].score,
															variant: "before"
														}), /* @__PURE__ */ jsx(Bar, { value: metric.score })]
													}),
													/* @__PURE__ */ jsx("small", {
														className: "text-muted d-block mt-2",
														children: metric.detail
													}),
													metric.tip && /* @__PURE__ */ jsxs("small", {
														className: "d-block mt-1",
														children: [/* @__PURE__ */ jsx("i", { className: "bi bi-lightbulb me-1 text-warning" }), metric.tip]
													})
												]
											}, key))
										]
									})
								})
							}), /* @__PURE__ */ jsx("div", {
								className: "col-lg-7",
								children: /* @__PURE__ */ jsx("section", {
									className: "rt-card h-100",
									children: /* @__PURE__ */ jsxs("div", {
										className: "p-4 rt-card-body",
										children: [
											/* @__PURE__ */ jsxs("h2", {
												className: "rt-card-title mb-3",
												children: [/* @__PURE__ */ jsx("i", { className: "bi bi-tags" }), "Job keywords"]
											}),
											/* @__PURE__ */ jsx("div", {
												className: "rt-tabs mb-3",
												role: "tablist",
												children: [
													[
														"added",
														"Added",
														result.added_keywords.length
													],
													[
														"kept",
														"Already had",
														keptKeywords.length
													],
													[
														"missing",
														"Missing",
														missingTotal
													]
												].map(([key, label, count]) => /* @__PURE__ */ jsxs("button", {
													type: "button",
													role: "tab",
													"aria-selected": keywordTab === key,
													className: `rt-tab ${keywordTab === key ? "is-active" : ""}`,
													onClick: () => setKeywordTab(key),
													children: [label, /* @__PURE__ */ jsx("span", {
														className: "rt-count",
														children: count
													})]
												}, key))
											}),
											keywordTab === "added" && (result.added_keywords.length === 0 ? /* @__PURE__ */ jsx("p", {
												className: "text-muted mb-0",
												children: "No new keywords could be added from your CV. Check the Missing tab to confirm skills you have."
											}) : /* @__PURE__ */ jsxs(Fragment, { children: [
												/* @__PURE__ */ jsx("p", {
													className: "text-muted small",
													children: "Keywords the tailored resume now contains that your original CV didn't."
												}),
												unverifiedCount > 0 && /* @__PURE__ */ jsxs("div", {
													className: "alert alert-warning d-flex gap-2 align-items-start py-2 small",
													children: [/* @__PURE__ */ jsx("i", { className: "bi bi-exclamation-triangle mt-1" }), /* @__PURE__ */ jsxs("span", { children: [
														/* @__PURE__ */ jsxs("strong", { children: [
															unverifiedCount,
															" keyword",
															unverifiedCount > 1 ? "s were" : " was",
															" worded in without a direct quote from your CV."
														] }),
														" ",
														"Check the preview and make sure each one is true for you before you apply."
													] })]
												}),
												/* @__PURE__ */ jsx("div", {
													className: "d-grid gap-2",
													children: result.added_keywords.map((keyword) => /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Chip, {
														keyword,
														tone: keyword.evidence ? "success" : "warning",
														title: keyword.evidence ? void 0 : "No direct CV evidence: verify before applying"
													}), keyword.evidence ? /* @__PURE__ */ jsxs("div", {
														className: "rt-evidence mt-1",
														children: [
															"From your CV: \"",
															keyword.evidence,
															"\""
														]
													}) : /* @__PURE__ */ jsx("div", {
														className: "rt-evidence rt-evidence-warning mt-1",
														children: "No direct CV evidence. Verify this is true for you"
													})] }, keyword.term))
												})
											] })),
											keywordTab === "kept" && /* @__PURE__ */ jsx("div", {
												className: "d-flex flex-wrap gap-2",
												children: keptKeywords.length === 0 ? /* @__PURE__ */ jsx("p", {
													className: "text-muted mb-0",
													children: "Your original CV didn't contain any of the job keywords."
												}) : keptKeywords.map((keyword) => /* @__PURE__ */ jsx(Chip, {
													keyword,
													tone: "info"
												}, keyword.term))
											}),
											keywordTab === "missing" && (missingTotal === 0 ? /* @__PURE__ */ jsxs("p", {
												className: "text-success mb-0",
												children: [/* @__PURE__ */ jsx("i", { className: "bi bi-trophy me-1" }), "Every job keyword is covered."]
											}) : /* @__PURE__ */ jsxs(Fragment, { children: [
												/* @__PURE__ */ jsxs("p", {
													className: "text-muted small mb-3",
													children: [
														"Not added because your CV doesn't show them. ",
														/* @__PURE__ */ jsx("strong", { children: "Tap the ones you genuinely have" }),
														" and we'll weave them into your resume."
													]
												}),
												/* @__PURE__ */ jsx("div", {
													className: "d-flex flex-wrap gap-2 mb-3",
													children: result.tailored_score.missing.map((keyword) => {
														const isSelected = selectedSkills.includes(keyword.term);
														return /* @__PURE__ */ jsxs("button", {
															type: "button",
															className: `rt-chip rt-chip-danger ${keyword.importance === "required" ? "rt-chip-required" : ""} ${isSelected ? "is-selected" : ""}`,
															onClick: () => toggleSkill(keyword.term),
															"aria-pressed": isSelected,
															children: [/* @__PURE__ */ jsx("i", { className: `bi ${isSelected ? "bi-check-lg" : "bi-plus"}` }), keyword.term]
														}, keyword.term);
													})
												}),
												/* @__PURE__ */ jsx(HiddenKeywordsNotice, { count: result.tailored_score.missing_hidden ?? 0 })
											] })),
											(keywordTab === "missing" || selectedSkills.length > 0) && /* @__PURE__ */ jsxs("div", {
												className: "border-top pt-3 mt-3",
												children: [
													/* @__PURE__ */ jsxs("form", {
														className: "input-group mb-2",
														onSubmit: addCustomSkill,
														children: [/* @__PURE__ */ jsx("input", {
															type: "text",
															className: "form-control rt-input",
															placeholder: "Add another skill you have (e.g. Docker)",
															value: customSkill,
															maxLength: 60,
															onChange: (event) => setCustomSkill(event.target.value)
														}), /* @__PURE__ */ jsx("button", {
															className: "btn rt-btn-soft",
															type: "submit",
															disabled: !customSkill.trim(),
															children: /* @__PURE__ */ jsx("i", { className: "bi bi-plus-lg" })
														})]
													}),
													selectedSkills.filter((skill) => !result.tailored_score.missing.some((keyword) => keyword.term === skill)).length > 0 && /* @__PURE__ */ jsx("div", {
														className: "d-flex flex-wrap gap-2 mb-2",
														children: selectedSkills.filter((skill) => !result.tailored_score.missing.some((keyword) => keyword.term === skill)).map((skill) => /* @__PURE__ */ jsxs("button", {
															type: "button",
															className: "rt-chip rt-chip-info is-selected",
															onClick: () => toggleSkill(skill),
															children: [skill, /* @__PURE__ */ jsx("i", { className: "bi bi-x" })]
														}, skill))
													}),
													refineError && /* @__PURE__ */ jsx("div", {
														className: "alert alert-danger py-2 small",
														children: refineError
													}),
													/* @__PURE__ */ jsx("button", {
														type: "button",
														className: "btn rt-btn-primary w-100",
														disabled: selectedSkills.length === 0 || isRefining,
														onClick: handleRefine,
														children: isRefining ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("span", {
															className: "spinner-border spinner-border-sm me-2",
															"aria-hidden": "true"
														}), "Updating your resume..."] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
															/* @__PURE__ */ jsx("i", { className: "bi bi-arrow-repeat me-2" }),
															"Update resume",
															selectedSkills.length > 0 ? ` with ${selectedSkills.length} skill${selectedSkills.length > 1 ? "s" : ""}` : ""
														] })
													}),
													result.confirmed_skills?.length > 0 && /* @__PURE__ */ jsxs("small", {
														className: "text-muted d-block mt-2",
														children: ["Already confirmed: ", result.confirmed_skills.join(", ")]
													})
												]
											})
										]
									})
								})
							})]
						}),
						result.changes?.length > 0 && /* @__PURE__ */ jsx("section", {
							className: "rt-card",
							children: /* @__PURE__ */ jsxs("div", {
								className: "p-4 rt-card-body",
								children: [/* @__PURE__ */ jsxs("h2", {
									className: "rt-card-title mb-3",
									children: [/* @__PURE__ */ jsx("i", { className: "bi bi-pencil-square" }), "What we changed"]
								}), /* @__PURE__ */ jsx("ul", {
									className: "rt-changes row row-cols-1 row-cols-md-2 g-0",
									children: result.changes.map((change, index) => /* @__PURE__ */ jsxs("li", {
										className: "pe-md-3",
										children: [/* @__PURE__ */ jsx("i", { className: "bi bi-check2-circle" }), /* @__PURE__ */ jsx("span", { children: change })]
									}, index))
								})]
							})
						}),
						/* @__PURE__ */ jsx("section", {
							className: "rt-card",
							children: /* @__PURE__ */ jsxs("div", {
								className: "p-4 rt-card-body",
								children: [
									/* @__PURE__ */ jsxs("div", {
										className: "d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-3",
										children: [/* @__PURE__ */ jsxs("h2", {
											className: "rt-card-title",
											children: [/* @__PURE__ */ jsx("i", { className: "bi bi-eye" }), "Preview"]
										}), /* @__PURE__ */ jsx("div", {
											className: "rt-tabs",
											role: "tablist",
											children: [["formatted", "Formatted"], ["plain", "ATS plain text"]].map(([key, label]) => /* @__PURE__ */ jsx("button", {
												type: "button",
												role: "tab",
												"aria-selected": previewTab === key,
												className: `rt-tab ${previewTab === key ? "is-active" : ""}`,
												onClick: () => setPreviewTab(key),
												children: label
											}, key))
										})]
									}),
									templates.length > 0 && /* @__PURE__ */ jsxs("div", {
										className: "mb-3",
										children: [
											/* @__PURE__ */ jsxs("div", {
												className: "d-flex align-items-center gap-2 mb-2",
												children: [
													/* @__PURE__ */ jsx("span", {
														className: "fw-semibold small",
														children: "Design"
													}),
													isSwitchingTemplate && /* @__PURE__ */ jsx("span", {
														className: "spinner-border spinner-border-sm text-secondary",
														"aria-label": "Applying design"
													}),
													/* @__PURE__ */ jsx("small", {
														className: "text-muted ms-auto d-none d-sm-inline",
														children: "Changing the design keeps your text and ATS score the same."
													})
												]
											}),
											/* @__PURE__ */ jsx(TemplatePicker, {
												templates,
												value: result.template,
												onChange: changeTemplate,
												disabled: isSwitchingTemplate,
												label: "Resume design",
												locked: !isPro
											}),
											!isPro && /* @__PURE__ */ jsxs("small", {
												className: "text-muted d-block mt-2",
												children: [
													"Designs with ",
													/* @__PURE__ */ jsx("i", { className: "bi bi-lock-fill" }),
													" are included in ",
													/* @__PURE__ */ jsx(Link, {
														href: "/pricing",
														children: "Pro"
													}),
													"."
												]
											}),
											templateError && /* @__PURE__ */ jsx("div", {
												className: "text-danger small mt-2",
												role: "alert",
												children: templateError
											}),
											upgrade && /* @__PURE__ */ jsx("div", {
												className: "mt-2",
												children: /* @__PURE__ */ jsx(UpgradeNotice, {
													upgrade,
													onClose: () => setUpgrade(null)
												})
											})
										]
									}),
									previewTab === "formatted" ? /* @__PURE__ */ jsx("iframe", {
										title: "Tailored resume preview",
										srcDoc: result.html,
										className: "rt-preview-frame"
									}) : /* @__PURE__ */ jsx("pre", {
										className: "rt-plain",
										children: result.plain_text
									}),
									previewTab === "plain" && /* @__PURE__ */ jsx("small", {
										className: "text-muted d-block mt-2",
										children: "This is exactly what an ATS parser reads from your PDF. Paste it into application forms that ask for plain text."
									})
								]
							})
						})
					]
				})
			}),
			toast && /* @__PURE__ */ jsxs("div", {
				className: "rt-toast",
				role: "status",
				children: [/* @__PURE__ */ jsx("i", { className: "bi bi-check-circle-fill text-success" }), toast]
			})
		]
	});
}
//#endregion
//#region resources/js/ssr.jsx
createServer((page) => createInertiaApp({
	page,
	render: ReactDOMServer.renderToString,
	title: (title) => title,
	resolve: (name) => {
		return (/* @__PURE__ */ Object.assign({
			"./Pages/Admin/AdSense.jsx": AdSense_exports,
			"./Pages/Admin/AiKeys.jsx": AiKeys_exports,
			"./Pages/Admin/Dashboard.jsx": Dashboard_exports,
			"./Pages/Admin/JobMetrics.jsx": JobMetrics_exports,
			"./Pages/Admin/Messages.jsx": Messages_exports,
			"./Pages/Admin/Posts/Form.jsx": Form_exports,
			"./Pages/Admin/Posts/Index.jsx": Index_exports$7,
			"./Pages/Admin/Resumes/Index.jsx": Index_exports$6,
			"./Pages/Admin/Settings.jsx": Settings_exports,
			"./Pages/Admin/Users/Index.jsx": Index_exports$5,
			"./Pages/Admin/Users/Show.jsx": Show_exports$2,
			"./Pages/Auth/ConfirmPassword.jsx": ConfirmPassword_exports,
			"./Pages/Auth/ForgotPassword.jsx": ForgotPassword_exports,
			"./Pages/Auth/Login.jsx": Login_exports,
			"./Pages/Auth/Register.jsx": Register_exports,
			"./Pages/Auth/ResetPassword.jsx": ResetPassword_exports,
			"./Pages/Auth/VerifyEmail.jsx": VerifyEmail_exports,
			"./Pages/Blog/Index.jsx": Index_exports$4,
			"./Pages/Blog/Show.jsx": Show_exports$1,
			"./Pages/Jobs/Index.jsx": Index_exports$3,
			"./Pages/Jobs/Show.jsx": Show_exports,
			"./Pages/Pages/About.jsx": About_exports,
			"./Pages/Pages/Contact.jsx": Contact_exports,
			"./Pages/Pages/Privacy.jsx": Privacy_exports,
			"./Pages/Pages/Terms.jsx": Terms_exports,
			"./Pages/Pricing.jsx": Pricing_exports,
			"./Pages/Profile/Edit.jsx": Edit_exports,
			"./Pages/ResumeTailor.jsx": ResumeTailor_exports,
			"./Pages/Resumes/Index.jsx": Index_exports$2,
			"./Pages/SavedJobs/Index.jsx": Index_exports$1,
			"./Pages/SavedSearches/Index.jsx": Index_exports,
			"./Pages/TailoredResume.jsx": TailoredResume_exports
		}))[`./Pages/${name}.jsx`];
	},
	setup: ({ App, props }) => /* @__PURE__ */ jsx(App, { ...props })
}));
//#endregion
export {};
