import React from 'react';
import Image from 'next/image';

const Logo: React.FC = () => {
    return (
        <div
            style={{
                /* Fill images require a sized container.
                 * We fix a "height" of 1.5em and preserve
                 * the original aspect ratio of 400:220.
                 */
                position: 'relative',
                height: '1.5em',
                width: 'auto',
                aspectRatio: '400 / 220',
                display: 'inline-block',
            }}
        >
            <Image
                src="/jq.svg"
                alt="jq logo"
                fill
                style={{ objectFit: 'contain' }}
            />
        </div>
    );
};

export default Logo;
