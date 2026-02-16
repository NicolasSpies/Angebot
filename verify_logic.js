// Native fetch is available in Node.js v24

const API_URL = 'http://localhost:3001/api';

async function testLogic() {
    console.log('--- Starting Logic Verification ---');

    try {
        // 1. Create a Customer
        console.log('1. Creating customer...');
        const customerRes = await fetch(`${API_URL}/customers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ company_name: 'Test Logic Corp' })
        });
        const { id: customerId } = await customerRes.json();
        console.log(`Customer created: ${customerId}`);

        // 2. Create an Offer
        console.log('2. Creating offer...');
        const offerRes = await fetch(`${API_URL}/offers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer_id: customerId,
                offer_name: 'Logic Test Offer',
                total: 1000,
                due_date: '2026-12-31'
            })
        });
        const { id: offerId } = await offerRes.json();
        const offer = await (await fetch(`${API_URL}/offers/${offerId}`)).json();
        console.log(`Offer created: ${offerId}, Token: ${offer.token}`);

        // 3. Send Offer (Auto-creates Project)
        console.log('3. Sending offer...');
        await fetch(`${API_URL}/offers/${offerId}/send`, { method: 'POST' });

        // 4. Verify Project Creation and Deadline Independence
        console.log('4. Verifying project...');
        const projects = await (await fetch(`${API_URL}/projects`)).json();
        const project = projects.find(p => p.offer_id === offerId);

        if (!project) throw new Error('Project not auto-created');
        console.log(`Project found: ${project.id}, Status: ${project.status}`);

        if (project.deadline !== null) {
            console.error(`FAILED: Project deadline should be independent (null), but is ${project.deadline}`);
        } else {
            console.log('SUCCESS: Project deadline is independent.');
        }

        if (project.project_review_limit !== 3) {
            console.error(`FAILED: Project review limit should be 3, but is ${project.project_review_limit}`);
        } else {
            console.log('SUCCESS: Project review limit is 3.');
        }

        // 5. Verify Strategic Notes Sync
        console.log('5. Verifying notes sync...');
        const payload = {
            ...offer,
            items: [],
            strategic_notes: 'Updated Strategic Notes'
        };
        console.log('Sending PUT with strategic_notes:', payload.strategic_notes);
        await fetch(`${API_URL}/offers/${offerId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const updatedProject = await (await fetch(`${API_URL}/projects/${project.id}`)).json();
        console.log('Updated Project details:', JSON.stringify(updatedProject));
        if (updatedProject.strategic_notes !== 'Updated Strategic Notes') {
            console.error(`FAILED: Strategic notes not synced. Found: ${updatedProject.strategic_notes}`);
        } else {
            console.log('SUCCESS: Strategic notes synced.');
        }

        // 6. Verify Tokens and Revision usage fields
        console.log('6. Verifying API field presence...');
        const reviewsRes = await fetch(`${API_URL}/projects/${project.id}/reviews`);
        const reviews = await reviewsRes.json();

        // Check project detail for field presence
        if ('revisions_used' in updatedProject && 'latest_review_status' in updatedProject) {
            console.log('SUCCESS: Project details include revision and review fields.');
        } else {
            console.error('FAILED: Project details missing revision or review fields.');
            process.exit(1);
        }

        console.log('--- Verification Complete ---');
    } catch (err) {
        console.error('Verification failed:', err);
    }
}

testLogic();
