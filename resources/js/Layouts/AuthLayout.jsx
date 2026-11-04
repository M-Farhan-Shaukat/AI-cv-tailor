import React from 'react';
import NavBar from '../Components/NavBar';
import MainLayout from './MainLayout';

export default function AuthLayout({ title, subtitle, children, footer, seo }) {
    return (
        <MainLayout seo={seo || { title }}>
            <NavBar />
            <div className="container py-5">
                <div className="row justify-content-center">
                    <div className="col-md-7 col-lg-5">
                        <div className="rt-card p-4 p-lg-5">
                            <h1 className="h4 fw-bold mb-1">{title}</h1>
                            {subtitle && <p className="text-muted small mb-4">{subtitle}</p>}
                            {children}
                        </div>
                        {footer}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
