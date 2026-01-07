import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        const scrollContainer = document.querySelector('[data-scroll-container]');
        if (scrollContainer) {
            scrollContainer.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
        }
    }, [pathname]);

    return null;
}
