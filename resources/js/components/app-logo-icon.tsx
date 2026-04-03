import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="4" fill="currentColor" />
            <circle cx="36" cy="12" r="4" fill="currentColor" />
            <path
                d="M16 12H32"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
            />
            <path
                d="M8 30C12 21.5 17.5 17 24 17C30.5 17 36 21.5 40 30"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
            />
            <path
                d="M14 30V38M34 30V38"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
            />
            <path
                d="M10 38H38"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
            />
        </svg>
    );
}
