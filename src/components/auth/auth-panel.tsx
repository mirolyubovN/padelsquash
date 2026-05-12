import type { ReactNode } from "react";
import { t } from "@/src/lib/i18n";

interface AuthPanelProps {
	title: string;
	titleId: string;
	children: ReactNode;
	brandSubtitle?: string;
	showBrand?: boolean;
}

interface AuthPanelBrandProps {
	subtitle: string;
}

interface AuthPanelLinksProps {
	children: ReactNode;
}

export function AuthPanel({
	title,
	titleId,
	children,
	brandSubtitle = t("auth.panel.brandSubtitle"),
	showBrand = true,
}: AuthPanelProps) {
	return (
		<section className="auth-panel" aria-labelledby={titleId}>
			<div className="auth-panel__box">
				{showBrand ? <AuthPanelBrand subtitle={brandSubtitle} /> : null}
				<h2 id={titleId} className="auth-panel__title">
					{title}
				</h2>
				{children}
			</div>
		</section>
	);
}

export function AuthPanelBrand({ subtitle }: AuthPanelBrandProps) {
	return (
		<div className="auth-panel__brand" aria-hidden="true">
			<span className="auth-panel__brand-mark">RC</span>
			<div>
				<p className="auth-panel__brand-title">Racket Community Kst</p>
				<p className="auth-panel__brand-subtitle">{subtitle}</p>
			</div>
		</div>
	);
}

export function AuthPanelLinks({ children }: AuthPanelLinksProps) {
	return <div className="auth-panel__links">{children}</div>;
}
