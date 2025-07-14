import { call } from '../src/tools/stagehand/tools.js';

async function testNetworkActivity() {
  console.log('Testing Network Activity Tool...');
  
  const sessionId = 'test-network-session';
  
  try {
    // Test 1: Navigate to a simple page
    console.log('1. Navigating to httpbin.org...');
    const navResult = await call('stagehand_navigate', { url: 'https://httpbin.org/get' }, sessionId);
    console.log('Navigation result:', navResult.isError ? 'ERROR' : 'SUCCESS');
    
    // Wait for network activity
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 2: Get network activity (simple mode)
    console.log('2. Getting network activity (simple mode)...');
    const networkResult = await call('stagehand_network_activity', {}, sessionId);
    
    if (networkResult.isError) {
      console.error('Network activity error:', networkResult.content[0].text);
      return;
    }
    
    const networkData = JSON.parse(networkResult.content[0].text);
    console.log('Network entries found:', networkData.entries.length);
    console.log('Summary:', networkData.summary);
    
    // Test 3: Get network activity (verbose mode)
    console.log('3. Getting network activity (verbose mode)...');
    const verboseResult = await call('stagehand_network_activity', { verbose: true }, sessionId);
    
    if (!verboseResult.isError) {
      const verboseData = JSON.parse(verboseResult.content[0].text);
      console.log('Verbose entries found:', verboseData.length);
      if (verboseData.length > 0) {
        console.log('First entry:', verboseData[0]);
      }
    }
    
    // Test 4: Filter by document type
    console.log('4. Filtering by document type...');
    const docResult = await call('stagehand_network_activity', { filter: 'document' }, sessionId);
    
    if (!docResult.isError) {
      const docData = JSON.parse(docResult.content[0].text);
      console.log('Document entries found:', docData.entries.length);
    }
    
    console.log('✅ Network Activity Tool test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testNetworkActivity().catch(console.error);