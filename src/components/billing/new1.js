<div className="invoice-table" style={{ marginTop: '15px', overflowX: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            border: '1px solid #000', 
            minWidth: '650px' 
          }}>
            
            <thead>
              <tr style={{ borderBottom: '1px solid #000' }}>
                {/* <th style={{ border: '1px solid #000', padding: '5px', width: '25%' }}>Particulars</th> */}
                <th style={{ border: '1px solid #000', padding: '5px', width: '5%' }}>S. No.</th>
                <th style={{ border: '1px solid #000', padding: '5px', width: '25%' }}>Particulars</th>
                <th style={{ border: '1px solid #000', padding: '5px', width: '10%' }}>Length (cm)</th>
                <th style={{ border: '1px solid #000', padding: '5px', width: '10%' }}>Width (cm)</th>
                <th style={{ border: '1px solid #000', padding: '5px', width: '10%' }}>Total (cm²)</th>
                <th style={{ border: '1px solid #000', padding: '5px', width: '10%' }}>Rate (cm²)</th>
                <th style={{ border: '1px solid #000', padding: '5px', width: '15%' }}>Amount (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>1</td>
                <td style={{ border: '1px solid #000', padding: '5px' }}>Publication Charges</td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{dimensions.length.toFixed(2)}</td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{dimensions.width.toFixed(2)}</td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{dimensions.area.toFixed(2)}</td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>
                  {(parseFloat(adDetails.ratePerSqCm) || 0).toFixed(2)}
                </td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>{adDetails.basePrice?.toFixed(2) || '-'}</td>
              </tr>
              {adDetails.colorCharge > 0 && (
                <tr>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>2</td>
                  <td style={{ border: '1px solid #000', padding: '5px' }}>Color Charge (40%)</td>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }} colSpan="4"></td>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>{adDetails.colorCharge?.toFixed(2) || '0.00'}</td>
                </tr>
              )}
              <tr>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{adDetails.colorCharge > 0 ? '3' : '2'}</td>
                <td style={{ border: '1px solid #000', padding: '5px' }}>Total Charge</td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }} colSpan="4"></td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>{(adDetails.basePrice + (adDetails.colorCharge || 0)).toFixed(2)}</td>
              </tr>
              {client.type === 'private' && adDetails.commission > 0 && (
                <tr>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{adDetails.colorCharge > 0 ? '4' : '3'}</td>
                  <td style={{ border: '1px solid #000', padding: '5px' }}>Less Agency Commission (15%)</td>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }} colSpan="4"></td>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>{adDetails.commission?.toFixed(2) || '0.00'}</td>
                </tr>
              )}
              
              {/* Tax rows depend on client type */}
              {client.type === 'state' ? (
                <>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>
                      {adDetails.colorCharge > 0 ? (client.type === 'private' ? '5' : '4') : (client.type === 'private' ? '4' : '3')}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '5px' }}>Add: CGST (2.5%)</td>
                    <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }} colSpan="4"></td>
                    <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>{(adDetails.gstAmount / 2).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>
                      {adDetails.colorCharge > 0 ? (client.type === 'private' ? '6' : '5') : (client.type === 'private' ? '5' : '4')}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '5px' }}>Add: SGST (2.5%)</td>
                    <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }} colSpan="4"></td>
                    <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>{(adDetails.gstAmount / 2).toFixed(2)}</td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>
                    {adDetails.colorCharge > 0 ? (client.type === 'private' ? '5' : '4') : (client.type === 'private' ? '4' : '3')}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '5px' }}>
                    Add: {client.type === 'central' ? 'IGST (5%)' : 'GST (5%)'}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }} colSpan="4"></td>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>{adDetails.gstAmount?.toFixed(2) || '0.00'}</td>
                </tr>
              )}
              
              <tr>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>
                  {adDetails.colorCharge > 0 ? (client.type === 'private' ? (client.type === 'state' ? '7' : '6') : (client.type === 'state' ? '6' : '5')) : 
                   (client.type === 'private' ? (client.type === 'state' ? '6' : '5') : (client.type === 'state' ? '5' : '4'))}
                </td>
                <td style={{ border: '1px solid #000', padding: '5px' }}>Branch Freeganj Ujjain</td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }} colSpan="4"></td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}></td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>
                  {adDetails.colorCharge > 0 ? (client.type === 'private' ? (client.type === 'state' ? '8' : '7') : (client.type === 'state' ? '7' : '6')) : 
                   (client.type === 'private' ? (client.type === 'state' ? '7' : '6') : (client.type === 'state' ? '6' : '5'))}
                </td>
                <td style={{ border: '1px solid #000', padding: '5px' }}>A/c No. : 910130110002710</td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }} colSpan="4"></td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}></td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }} colSpan="6">
                  <strong>Grand Total</strong>
                </td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right', fontWeight: 'bold' }}>
                  {adDetails.finalPrice?.toFixed(2) || '0.00'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>