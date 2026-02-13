import React from 'react';

const Table = ({ headers, children, className = '', ...props }) => {
    return (
        <div className={`table-container ${className}`} {...props}>
            <table style={{ margin: 0 }}>
                <thead>
                    <tr>
                        {headers.map((h, i) => (
                            <th key={i}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>{children}</tbody>
            </table>
        </div>
    );
};

export default Table;
